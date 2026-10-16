/**
 * Fila de e-mails dos formulários do site.
 *
 * Todo envio de formulário vira um registro em "Envios de Formulário" com
 * status "pendente" antes de qualquer tentativa no Resend. A fila manda os
 * pendentes do mais antigo pro mais novo; quando o Resend responde que a
 * cota (100/dia no plano gratuito) acabou, ela pausa e tenta de novo na
 * próxima rodada do cron — os excedentes do dia saem quando a cota voltar,
 * sem perder nenhum envio.
 */

const UID = 'api::envio-formulario.envio-formulario';

// Cota esgotada: espera esse tempo antes de bater no Resend de novo. Não
// precisamos saber quando a janela do Resend vira — o cron de hora em hora
// tenta e, se ainda estiver esgotada, pausa outra vez.
const PAUSA_COTA_MS = 60 * 60 * 1000;
// Erros que não são de cota (destinatário inválido, anexo recusado...)
// viram "erro" depois de algumas tentativas, pra não travar a fila.
const MAX_TENTATIVAS = 5;
// O Resend aceita poucas requisições por segundo; espaçar evita 429 de
// rate limit quando a fila tem vários pendentes.
const INTERVALO_ENTRE_ENVIOS_MS = 600;

let processando = false;
let rodarDeNovo = false;
let pausadoAte = 0;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function escapar(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linha(label: string, valor: string | undefined) {
  if (!valor) return '';
  return `<tr><td style="padding:6px 16px 6px 0;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0">${escapar(valor).replace(/\n/g, '<br>')}</td></tr>`;
}

function template(titulo: string, linhas: string, recebidoEm: Date) {
  const quando = recebidoEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#000;padding:24px 32px">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:0.05em">TV1</span>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 24px;font-size:18px">${titulo}</h2>
        <table style="border-collapse:collapse;width:100%">${linhas}</table>
        <p style="margin:24px 0 0;font-size:12px;color:#888">Recebido pelo site em ${quando}</p>
      </div>
    </div>
  `;
}

function montarEmail(tipo: string, d: Record<string, string>, recebidoEm: Date) {
  if (tipo === 'seja-cliente') {
    return {
      assunto: '[TV1] Novo contato — Seja Cliente',
      html: template('Novo contato: Seja Cliente', [
        linha('Nome',     d.nome),
        linha('Empresa',  d.empresa),
        linha('Contato',  d.contato),
        linha('Mensagem', d.mensagem),
      ].join(''), recebidoEm),
    };
  }
  if (tipo === 'outros-assuntos') {
    return {
      assunto: '[TV1] Novo contato — Outros Assuntos',
      html: template('Novo contato: Outros Assuntos', [
        linha('Nome',     d.nome),
        linha('E-mail',   d.email),
        linha('Assunto',  d.assunto),
        linha('Mensagem', d.mensagem),
      ].join(''), recebidoEm),
    };
  }
  // trabalhe-conosco
  const cargo = (d.cargo || 'Trabalhe Conosco').replace(/[\r\n]+/g, ' ').slice(0, 120);
  return {
    assunto: `[TV1] Candidatura — ${cargo}`,
    html: template('Candidatura: Trabalhe Conosco', [
      linha('Nome',            d.nome),
      linha('Cargo desejado',  d.cargo),
      linha('Área de atuação', d.area),
      linha('E-mail',          d.email),
      linha('Telefone',        d.telefone),
      linha('Cidade',          d.cidade),
      linha('Última empresa',  d.empresa),
      linha('Pretensão',       d.pretensao ? `R$ ${d.pretensao}` : undefined),
      linha('LinkedIn',        d.linkedin),
      linha('Portfólio',       d.portfolio_link),
    ].join(''), recebidoEm),
  };
}

type Resultado = { ok: true } | { cota: true; erro: string } | { limite: true; erro: string } | { erro: string };

async function enviarParaResend(payload: Record<string, unknown>): Promise<Resultado> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { erro: 'RESEND_API_KEY não configurada' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };

  const texto = await res.text();
  if (res.status === 429) {
    // daily_quota_exceeded / monthly_quota_exceeded → cota; o resto é rate limit.
    return /quota/i.test(texto) ? { cota: true, erro: texto } : { limite: true, erro: texto };
  }
  return { erro: `HTTP ${res.status}: ${texto}` };
}

export async function processarFila() {
  if (Date.now() < pausadoAte) return;
  // Envio que chega com a fila rodando não pode esperar o próximo cron:
  // marca pra rodar de novo assim que a rodada atual terminar.
  if (processando) {
    rodarDeNovo = true;
    return;
  }
  processando = true;
  rodarDeNovo = false;

  try {
    const config = await strapi.db
      .query('api::configuracoes-email.configuracoes-email')
      .findOne({}) as Record<string, string> | null;

    const destinatarios: Record<string, string | undefined> = {
      'seja-cliente':     config?.email_seja_cliente,
      'trabalhe-conosco': config?.email_trabalhe_conosco,
      'outros-assuntos':  config?.email_outros_assuntos,
    };
    const remetente = config?.email_remetente || 'formularios@tv1.com.br';

    const pendentes = await strapi.documents(UID).findMany({
      filters: { status: 'pendente' },
      sort: 'createdAt:asc',
      limit: 100,
    }) as any[];

    for (const envio of pendentes) {
      const para = (destinatarios[envio.tipo] || '').split(',').map((e) => e.trim()).filter(Boolean);
      const { assunto, html } = montarEmail(envio.tipo, envio.dados || {}, new Date(envio.createdAt));

      const payload: Record<string, unknown> = { from: remetente, to: para, subject: assunto, html };
      if (envio.curriculo_base64 && envio.curriculo_nome) {
        payload.attachments = [{ filename: envio.curriculo_nome, content: envio.curriculo_base64 }];
      }

      const resultado: Resultado = para.length
        ? await enviarParaResend(payload)
        : { erro: `Destinatário de "${envio.tipo}" não configurado no CMS` };

      if ('ok' in resultado) {
        // O currículo só precisava ficar guardado até o e-mail sair.
        await strapi.documents(UID).update({
          documentId: envio.documentId,
          data: { status: 'enviado', enviado_em: new Date(), curriculo_base64: null, ultimo_erro: null } as any,
        });
      } else if ('cota' in resultado) {
        pausadoAte = Date.now() + PAUSA_COTA_MS;
        strapi.log.warn(`Fila de e-mails: cota do Resend esgotada, ${pendentes.length} pendente(s) aguardando. ${resultado.erro}`);
        break;
      } else if ('limite' in resultado) {
        // Rate limit momentâneo: para esta rodada, a próxima continua daqui.
        break;
      } else {
        const tentativas = (envio.tentativas || 0) + 1;
        strapi.log.error(`Fila de e-mails: falha no envio ${envio.documentId} (tentativa ${tentativas}): ${resultado.erro}`);
        await strapi.documents(UID).update({
          documentId: envio.documentId,
          data: {
            tentativas,
            ultimo_erro: resultado.erro.slice(0, 2000),
            status: tentativas >= MAX_TENTATIVAS ? 'erro' : 'pendente',
          } as any,
        });
      }

      await esperar(INTERVALO_ENTRE_ENVIOS_MS);
    }
  } catch (err) {
    strapi.log.error(`Fila de e-mails: ${(err as Error).message}`);
  } finally {
    processando = false;
    if (rodarDeNovo) setImmediate(processarFila);
  }
}
