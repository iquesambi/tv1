/**
 * Lista mídias que existem no Strapi mas não estão vinculadas a NENHUM
 * conteúdo (campo de imagem/vídeo de nenhum case, bloco, pessoa, etc).
 * Toda mídia em uso tem uma linha em `files_related_mph` (a tabela de
 * relação polimórfica do plugin de upload); quem não tem está "órfã".
 *
 * Modo padrão: só leitura, não apaga nada.
 *   GET /api/midias-nao-usadas?token=SEGREDO
 *
 * Modo remoção (apaga do Strapi E do Cloudinary — irreversível):
 *   GET /api/midias-nao-usadas?token=SEGREDO&modo=remover
 *   Por segurança, exige também &confirmar=sim
 */

const { v2: cloudinary } = require('cloudinary');

export async function midiasNaoUsadas(ctx: any) {
  const tokenEsperado = process.env.CLOUDINARY_IMPORT_TOKEN;
  if (!tokenEsperado) return ctx.badRequest('CLOUDINARY_IMPORT_TOKEN não configurado no servidor.');
  if (ctx.query.token !== tokenEsperado) return ctx.unauthorized('Token inválido.');

  try {
    const knex = strapi.db.connection;

    const orfas = await knex('files')
      .leftJoin('files_related_mph', 'files.id', 'files_related_mph.file_id')
      .whereNull('files_related_mph.file_id')
      .select(
        'files.id',
        'files.name',
        'files.url',
        'files.mime',
        'files.size',
        'files.width',
        'files.height',
        'files.provider',
        'files.provider_metadata',
        'files.created_at'
      )
      .orderBy('files.created_at', 'desc');

    const totalKb = orfas.reduce((acc: number, f: any) => acc + (f.size || 0), 0);

    const lista = orfas.map((f: any) => ({
      id: f.id,
      nome: f.name,
      url: f.url,
      mime: f.mime,
      tamanho_kb: f.size,
      largura: f.width,
      altura: f.height,
      criado_em: f.created_at,
      public_id: f.provider_metadata?.public_id ?? null,
    }));

    if (ctx.query.modo !== 'remover') {
      ctx.body = {
        modo: 'listar',
        total_orfas: lista.length,
        total_kb: Math.round(totalKb),
        total_mb: Math.round(totalKb / 1024 * 10) / 10,
        midias: lista,
        dica: lista.length > 0
          ? 'Confira a lista. Pra apagar (Strapi + Cloudinary, irreversível), chame de novo com &modo=remover&confirmar=sim'
          : 'Nenhuma mídia órfã encontrada.',
      };
      return;
    }

    if (ctx.query.confirmar !== 'sim') {
      return ctx.badRequest('Pra remover, adicione também &confirmar=sim na URL. Essa ação é irreversível.');
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });

    let removidos = 0;
    const erros: string[] = [];
    for (const f of orfas) {
      try {
        const publicId = f.provider_metadata?.public_id;
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(async () => {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
          });
        }
        await knex('files').where({ id: f.id }).del();
        removidos++;
      } catch (e: any) {
        erros.push(`${f.name} (id ${f.id}): ${e.message}`);
      }
    }

    ctx.body = { modo: 'remover', removidos, erros };
  } catch (e: any) {
    strapi.log.error(`[midias-nao-usadas] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { ok: false, erro: e.message };
  }
}
