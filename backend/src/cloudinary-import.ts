/**
 * Importa pra Media Library do Strapi todos os arquivos que já existem no
 * Cloudinary mas ainda não têm registro no Strapi. Útil para subir fotos em
 * massa direto no Cloudinary (bem mais rápido que pelo Strapi) e depois
 * sincronizar de uma vez.
 *
 * Registrado como rota em src/index.ts:
 *   GET /api/importar-cloudinary?token=SEGREDO
 *   - O token é comparado com a env CLOUDINARY_IMPORT_TOKEN. Se a env não
 *     estiver definida, a rota recusa (não fica aberta por acidente).
 *
 * Não faz re-upload: só cria os registros apontando pras URLs do Cloudinary.
 */

const { v2: cloudinary } = require('cloudinary');

// jpg/jpeg, etc. — mime pra exibição na Media Library
const MIME_OVERRIDES: Record<string, string> = {
  jpg: 'jpeg',
  svg: 'svg+xml',
};

function mimeFor(resourceType: string, format: string) {
  const tipo = resourceType === 'video' ? 'video' : 'image';
  const sub = MIME_OVERRIDES[format] || format;
  return `${tipo}/${sub}`;
}

function nomeFor(publicId: string, format: string) {
  const ultimo = publicId.split('/').pop() || publicId;
  return `${ultimo}.${format}`;
}

// O Strapi gera variações de tamanho de cada imagem e sobe cada uma como um
// recurso separado no Cloudinary, com o public_id prefixado. Essas NÃO são
// arquivos originais — na Media Library elas vivem dentro do campo `formats`
// do original. Então ignoramos no import e podemos limpar as que já entraram.
const PREFIXOS_VARIANTE = ['thumbnail_', 'small_', 'medium_', 'large_'];
function ehVariante(publicId: string) {
  const ultimo = (publicId.split('/').pop() || publicId).toLowerCase();
  return PREFIXOS_VARIANTE.some((p) => ultimo.startsWith(p));
}

export async function importarCloudinary(ctx: any) {
  const tokenEsperado = process.env.CLOUDINARY_IMPORT_TOKEN;

  if (!tokenEsperado) {
    return ctx.badRequest(
      'CLOUDINARY_IMPORT_TOKEN não está configurado no servidor. Defina essa env var antes de usar a importação.'
    );
  }
  if (ctx.query.token !== tokenEsperado) {
    return ctx.unauthorized('Token inválido.');
  }

  try {
    // Modo limpeza: remove (só do Strapi, não do Cloudinary) as entradas de
    // variação que entraram por engano. Uso: ...&modo=limpar-variantes
    if (ctx.query.modo === 'limpar-variantes') {
      let removidos = 0;
      for (const p of PREFIXOS_VARIANTE) {
        const r = await strapi.db
          .query('plugin::upload.file')
          .deleteMany({ where: { hash: { $startsWith: p } } });
        removidos += r?.count ?? 0;
      }
      ctx.body = { modo: 'limpar-variantes', removidos };
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });

    // 1. public_ids que o Strapi já conhece
    const existentes = await strapi.db
      .query('plugin::upload.file')
      .findMany({ select: ['provider_metadata'] });
    const jaImportados = new Set<string>(
      existentes
        .map((f: any) => f?.provider_metadata?.public_id)
        .filter(Boolean)
    );

    // 2. lista tudo do Cloudinary (imagens + vídeos), paginando
    const recursos: any[] = [];
    for (const resourceType of ['image', 'video']) {
      let cursor: string | undefined;
      do {
        const resp = await cloudinary.api.resources({
          resource_type: resourceType,
          type: 'upload',
          max_results: 500,
          next_cursor: cursor,
        });
        recursos.push(...(resp.resources || []));
        cursor = resp.next_cursor;
      } while (cursor);
    }

    // 3. cria os que faltam
    let importados = 0;
    let pulados = 0;
    let variantes = 0;
    const erros: string[] = [];

    for (const r of recursos) {
      if (ehVariante(r.public_id)) {
        variantes++;
        continue;
      }
      if (jaImportados.has(r.public_id)) {
        pulados++;
        continue;
      }
      try {
        await strapi.db.query('plugin::upload.file').create({
          data: {
            name: nomeFor(r.public_id, r.format),
            alternativeText: null,
            caption: null,
            hash: r.public_id,
            ext: `.${r.format}`,
            mime: mimeFor(r.resource_type, r.format),
            size: Number(((r.bytes || 0) / 1024).toFixed(2)),
            width: r.width ?? null,
            height: r.height ?? null,
            url: r.secure_url,
            provider: 'cloudinary',
            provider_metadata: {
              public_id: r.public_id,
              resource_type: r.resource_type,
            },
            folderPath: '/',
          },
        });
        importados++;
      } catch (e: any) {
        erros.push(`${r.public_id}: ${e.message}`);
      }
    }

    ctx.body = {
      total_no_cloudinary: recursos.length,
      importados,
      ja_existiam: pulados,
      variantes_ignoradas: variantes,
      erros,
    };
  } catch (e: any) {
    // Em vez de um 500 genérico, devolve a causa real pra facilitar o diagnóstico.
    strapi.log.error(`[importar-cloudinary] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { ok: false, erro: e.message };
  }
}
