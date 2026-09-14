/**
 * Migração única do Quem Somos: leva o conteúdo dos campos soltos para os
 * componentes de bloco (abertura, foto, da_era, content_driven).
 *
 * Roda no bootstrap e é idempotente — se qualquer bloco já tem conteúdo,
 * não faz nada, então subir o servidor de novo não sobrescreve edição
 * feita no CMS depois da migração.
 *
 * Mexe só no rascunho. A versão publicada continua com os campos antigos
 * até alguém publicar, e o front lê os blocos com queda pros campos
 * antigos justamente pra essa janela (ver QuemSomosPage.jsx).
 *
 * ETAPA 2, depois que isto rodar em produção e o conteúdo estiver
 * publicado: remover os campos antigos do schema, a queda no front e este
 * arquivo.
 */

const UID = 'api::quem-somos.quem-somos';

export async function migrarQuemSomosParaBlocos(strapi: any) {
  try {
    const doc = await strapi.documents(UID).findFirst({
      status: 'draft',
      populate: {
        abertura: true,
        foto: { populate: { imagem: true } },
        da_era: true,
        content_driven: true,
        imagem: true,
      },
    });

    if (!doc) return;

    if (doc.abertura || doc.foto || doc.da_era || doc.content_driven) {
      return;
    }

    await strapi.documents(UID).update({
      documentId: doc.documentId,
      status: 'draft',
      data: {
        abertura: {
          mostrar: doc.mostrar_intro ?? true,
          titulo: doc.titulo_intro ?? null,
          titulo_acima: doc.titulo_acima ?? null,
          texto: doc.texto_intro ?? null,
          titulo_abaixo: doc.titulo_abaixo ?? null,
        },
        foto: {
          mostrar: doc.mostrar_imagem ?? true,
          imagem: doc.imagem?.id ?? null,
        },
        da_era: {
          mostrar: doc.mostrar_era ?? true,
          titulo: doc.titulo_era ?? null,
          texto: doc.texto_era ?? null,
        },
        content_driven: {
          mostrar: doc.mostrar_content_driven ?? true,
          tagline: doc.tagline ?? null,
        },
      },
    });

    strapi.log.info(
      '[quem-somos] conteúdo copiado dos campos antigos para os blocos. ' +
      'Publique a página no CMS para levar os blocos ao ar.'
    );
  } catch (e: any) {
    // Não derruba o boot: sem a migração o front continua lendo os campos
    // antigos, então a página segue no ar.
    strapi.log.error(`[quem-somos] migração para blocos falhou: ${e.stack || e.message}`);
  }
}
