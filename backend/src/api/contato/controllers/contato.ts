import type { Core } from '@strapi/strapi';

function linha(label: string, valor: string | undefined) {
  if (!valor) return '';
  return `<tr><td style="padding:6px 16px 6px 0;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0">${valor.replace(/\n/g, '<br>')}</td></tr>`;
}

function template(titulo: string, linhas: string) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#000;padding:24px 32px">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:0.05em">TV1</span>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 24px;font-size:18px">${titulo}</h2>
        <table style="border-collapse:collapse;width:100%">${linhas}</table>
      </div>
    </div>
  `;
}

export default {
  async enviar(ctx: Core.Context) {
    const body = ctx.request.body as Record<string, string>;
    const { tipo, curriculo_base64, curriculo_nome, ...campos } = body;

    if (!tipo) return ctx.badRequest('Campo "tipo" obrigatório');

    // Busca configurações de email no CMS
    const config = await strapi.db
      .query('api::configuracoes-email.configuracoes-email')
      .findOne({}) as Record<string, string> | null;

    const destinatarioMap: Record<string, string | undefined> = {
      'seja-cliente':      config?.email_seja_cliente,
      'trabalhe-conosco':  config?.email_trabalhe_conosco,
      'outros-assuntos':   config?.email_outros_assuntos,
    };

    const para = destinatarioMap[tipo];
    if (!para) {
      return ctx.badRequest('Tipo inválido ou destinatário não configurado no CMS');
    }

    const remetente = config?.email_remetente || 'formularios@tv1.com.br';

    // Monta HTML e assunto por tipo
    let assunto: string;
    let html: string;

    if (tipo === 'seja-cliente') {
      assunto = `[TV1] Novo contato — Seja Cliente`;
      html = template('Novo contato: Seja Cliente', [
        linha('Nome',     campos.nome),
        linha('Empresa',  campos.empresa),
        linha('Contato',  campos.contato),
        linha('Mensagem', campos.mensagem),
      ].join(''));
    } else if (tipo === 'outros-assuntos') {
      assunto = `[TV1] Novo contato — Outros Assuntos`;
      html = template('Novo contato: Outros Assuntos', [
        linha('Nome',     campos.nome),
        linha('E-mail',   campos.email),
        linha('Assunto',  campos.assunto),
        linha('Mensagem', campos.mensagem),
      ].join(''));
    } else if (tipo === 'trabalhe-conosco') {
      assunto = `[TV1] Candidatura — ${campos.cargo || 'Trabalhe Conosco'}`;
      html = template('Candidatura: Trabalhe Conosco', [
        linha('Nome',           campos.nome),
        linha('Cargo desejado', campos.cargo),
        linha('Área de atuação',campos.area),
        linha('E-mail',         campos.email),
        linha('Telefone',       campos.telefone),
        linha('Cidade',         campos.cidade),
        linha('Última empresa', campos.empresa),
        linha('Pretensão',      campos.pretensao ? `R$ ${campos.pretensao}` : undefined),
        linha('LinkedIn',       campos.linkedin),
        linha('Portfólio',      campos.portfolio_link),
      ].join(''));
    } else {
      return ctx.badRequest('Tipo inválido');
    }

    // Monta payload do Resend
    const payload: Record<string, unknown> = {
      from: remetente,
      to:   [para],
      subject: assunto,
      html,
    };

    // Anexa currículo se enviado (base64)
    if (curriculo_base64 && curriculo_nome) {
      payload.attachments = [{ filename: curriculo_nome, content: curriculo_base64 }];
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      strapi.log.error('RESEND_API_KEY não configurada');
      return ctx.internalServerError('Configuração de email ausente');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      strapi.log.error(`Resend error: ${err}`);
      return ctx.internalServerError('Erro ao enviar email');
    }

    return ctx.send({ ok: true });
  },
};
