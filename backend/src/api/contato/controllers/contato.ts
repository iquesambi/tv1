import { processarFila } from '../../../fila-emails';

// Campos aceitos por formulário. O que não estiver aqui é descartado, e os
// marcados como obrigatórios precisam vir preenchidos.
const CAMPOS: Record<string, { campos: string[]; obrigatorios: string[] }> = {
  'seja-cliente': {
    campos: ['nome', 'empresa', 'contato', 'mensagem'],
    obrigatorios: ['nome', 'contato', 'mensagem'],
  },
  'outros-assuntos': {
    campos: ['nome', 'email', 'assunto', 'mensagem'],
    obrigatorios: ['nome', 'email', 'mensagem'],
  },
  'trabalhe-conosco': {
    campos: ['nome', 'cargo', 'area', 'email', 'telefone', 'cidade', 'empresa', 'pretensao', 'linkedin', 'portfolio_link'],
    obrigatorios: ['nome', 'email'],
  },
};

const MAX_MENSAGEM = 5000;
const MAX_CAMPO = 500;
// 5 MB de PDF viram ~6,7 MB em base64; o front já barra acima de 5 MB.
const MAX_CURRICULO_BASE64 = 7 * 1024 * 1024;

// Limite por IP, em memória (some quando o servidor reinicia — suficiente
// pra segurar robô disparando em sequência).
const LIMITE_POR_IP = 5;
const JANELA_IP_MS = 60 * 60 * 1000;
const enviosPorIp = new Map<string, number[]>();

function ipDoCliente(ctx: any): string {
  const h = ctx.request.headers;
  if (h['true-client-ip']) return String(h['true-client-ip']);
  if (h['cf-connecting-ip']) return String(h['cf-connecting-ip']);
  // O proxy do Render acrescenta o IP real no fim; o começo pode ter sido
  // forjado pelo próprio cliente.
  const xff = String(h['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return xff[xff.length - 1] || ctx.ip;
}

function excedeuLimite(ip: string) {
  const agora = Date.now();
  const recentes = (enviosPorIp.get(ip) || []).filter((t) => agora - t < JANELA_IP_MS);
  if (recentes.length >= LIMITE_POR_IP) {
    enviosPorIp.set(ip, recentes);
    return true;
  }
  recentes.push(agora);
  enviosPorIp.set(ip, recentes);
  // Limpeza simples pra o Map não crescer pra sempre.
  if (enviosPorIp.size > 5000) {
    for (const [chave, tempos] of enviosPorIp) {
      if (!tempos.some((t) => agora - t < JANELA_IP_MS)) enviosPorIp.delete(chave);
    }
  }
  return false;
}

export default {
  async enviar(ctx: any) {
    const body = (ctx.request.body || {}) as Record<string, unknown>;
    const { tipo, website, curriculo_base64, curriculo_nome } = body as Record<string, string | undefined>;

    // Honeypot: o campo "website" fica invisível no formulário. Pessoa não
    // preenche; robô preenche. Responde sucesso pra o robô não insistir.
    if (website) return ctx.send({ ok: true });

    const regras = tipo ? CAMPOS[tipo] : undefined;
    if (!regras) return ctx.badRequest('Tipo inválido');

    const dados: Record<string, string> = {};
    for (const campo of regras.campos) {
      const valor = body[campo];
      if (valor == null || valor === '') continue;
      if (typeof valor !== 'string') return ctx.badRequest(`Campo "${campo}" inválido`);
      const max = campo === 'mensagem' ? MAX_MENSAGEM : MAX_CAMPO;
      if (valor.length > max) return ctx.badRequest(`Campo "${campo}" muito longo`);
      dados[campo] = valor.trim();
    }
    const faltando = regras.obrigatorios.filter((c) => !dados[c]);
    if (faltando.length) return ctx.badRequest(`Campos obrigatórios: ${faltando.join(', ')}`);

    if (curriculo_base64) {
      if (tipo !== 'trabalhe-conosco' || typeof curriculo_base64 !== 'string' || typeof curriculo_nome !== 'string') {
        return ctx.badRequest('Anexo inválido');
      }
      if (!/\.pdf$/i.test(curriculo_nome)) return ctx.badRequest('O currículo precisa ser PDF');
      if (curriculo_base64.length > MAX_CURRICULO_BASE64) return ctx.badRequest('Currículo acima de 5 MB');
    }

    if (excedeuLimite(ipDoCliente(ctx))) {
      ctx.status = 429;
      ctx.body = { error: { status: 429, message: 'Muitos envios em pouco tempo. Tente novamente mais tarde.' } };
      return;
    }

    // Salva antes de tentar o e-mail: se o Resend estiver sem cota ou fora
    // do ar, o envio fica pendente e a fila manda depois.
    await strapi.documents('api::envio-formulario.envio-formulario').create({
      data: {
        tipo,
        status: 'pendente',
        nome: dados.nome,
        dados,
        curriculo_nome: curriculo_base64 ? curriculo_nome.slice(0, 200) : null,
        curriculo_base64: curriculo_base64 || null,
        tentativas: 0,
      } as any,
    });

    // Não espera o envio: a pessoa recebe a confirmação na hora e a fila
    // segue em segundo plano.
    processarFila();

    return ctx.send({ ok: true });
  },
};
