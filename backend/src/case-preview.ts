/**
 * Serve o detalhe de um case pro modo preview do Strapi (rascunho ou
 * publicado), sem passar pelo cache público — o link só existe dentro do
 * admin e carrega o conteúdo mais recente sempre. Protegido por um token
 * compartilhado (PREVIEW_SECRET) pra não expor rascunhos publicamente.
 */

export async function casePreviewRoute(ctx: any) {
  try {
    const { documentId, status, token } = ctx.query;

    if (!token || token !== process.env.PREVIEW_SECRET) {
      ctx.status = 403;
      ctx.body = { data: null, error: 'Token inválido.' };
      return;
    }
    if (!documentId) return ctx.badRequest('documentId obrigatório.');

    const caso: any = await strapi.documents('api::case.case').findOne({
      documentId,
      status: status === 'draft' ? 'draft' : 'published',
      populate: {
        cliente: true,
        imagem_capa: true,
        blocos: { populate: '*' },
      },
    });

    ctx.body = { data: caso ? { data: caso, is40Anos: false } : null };
  } catch (e: any) {
    strapi.log.error(`[case-preview] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { data: null, error: e.message };
  }
}
