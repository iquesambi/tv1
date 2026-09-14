/**
 * Serve o detalhe de um case (normal ou de 40 anos) pro modo preview do
 * Strapi (rascunho ou publicado), sem passar pelo cache público — o link
 * só existe dentro do admin e carrega o conteúdo mais recente sempre.
 * Protegido por um token compartilhado (PREVIEW_SECRET) pra não expor
 * rascunhos publicamente.
 */

// O documentId sozinho não diz de qual dos dois tipos o case é, então
// procura nos dois — mesma estratégia do case-detail-cache. É endpoint de
// admin, a consulta a mais não pesa.
const TIPOS = [
  { uid: 'api::case.case', is40Anos: false },
  { uid: 'api::case-quarenta-anos.case-quarenta-anos', is40Anos: true },
];

export async function casePreviewRoute(ctx: any) {
  try {
    const { documentId, status, token } = ctx.query;

    if (!token || token !== process.env.PREVIEW_SECRET) {
      ctx.status = 403;
      ctx.body = { data: null, error: 'Token inválido.' };
      return;
    }
    if (!documentId) return ctx.badRequest('documentId obrigatório.');

    let encontrado: any = null;

    for (const { uid, is40Anos } of TIPOS) {
      const caso: any = await strapi.documents(uid as any).findOne({
        documentId,
        status: status === 'draft' ? 'draft' : 'published',
        populate: {
          cliente: true,
          imagem_capa: true,
          blocos: { populate: '*' },
        },
      });
      if (caso) {
        encontrado = { data: caso, is40Anos };
        break;
      }
    }

    ctx.body = { data: encontrado };
  } catch (e: any) {
    strapi.log.error(`[case-preview] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { data: null, error: e.message };
  }
}
