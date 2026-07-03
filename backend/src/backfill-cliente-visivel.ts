/**
 * Preenche `visivel = true` nos clientes que ficaram com o campo nulo —
 * o `default: true` do schema só se aplica a registros criados depois do
 * campo existir, não faz backfill dos já existentes. Como o filtro do
 * frontend usa `visivel][$ne]=false`, e em SQL `null != false` não é
 * verdadeiro, os clientes antigos (nulos) sumiam de todas as listagens.
 *
 * Uso: GET /api/backfill-cliente-visivel?token=SEGREDO
 *   - token comparado com a env CLOUDINARY_IMPORT_TOKEN (reaproveitada).
 *
 * Idempotente: só afeta registros com visivel ainda nulo.
 */

export async function backfillClienteVisivel(ctx: any) {
  const tokenEsperado = process.env.CLOUDINARY_IMPORT_TOKEN;
  if (!tokenEsperado) return ctx.badRequest('CLOUDINARY_IMPORT_TOKEN não configurado no servidor.');
  if (ctx.query.token !== tokenEsperado) return ctx.unauthorized('Token inválido.');

  try {
    const nulos: any[] = await strapi.db.query('api::cliente.cliente').findMany({
      where: { visivel: { $null: true } },
      select: ['id'],
    });

    for (const c of nulos) {
      await strapi.db.query('api::cliente.cliente').update({
        where: { id: c.id },
        data: { visivel: true },
      });
    }

    ctx.body = { ok: true, atualizados: nulos.length };
  } catch (e: any) {
    strapi.log.error(`[backfill-cliente-visivel] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { ok: false, erro: e.message };
  }
}
