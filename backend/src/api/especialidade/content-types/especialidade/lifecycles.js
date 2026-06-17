'use strict';

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    await addSublinkToNav(result);
  },
};

async function addSublinkToNav(especialidade) {
  try {
    const nav = await strapi.documents('api::navigation.navigation').findFirst({
      status: 'draft',
      populate: {
        links: {
          populate: {
            sublinks: {
              populate: { especialidade: true },
            },
          },
        },
      },
    });
    if (!nav) return;

    const casesLink = nav.links?.find(
      (l) => (l.label ?? '').toLowerCase() === 'cases' || l.url === '/cases'
    );
    if (!casesLink) return;

    const sublinks = casesLink.sublinks ?? [];

    // Já existe? não duplica
    if (sublinks.some((s) => s.especialidade?.documentId === especialidade.documentId)) return;

    const updatedLinks = nav.links.map((link) => {
      const base = {
        id: link.id,
        label: link.label,
        url: link.url,
        sublinks: (link.sublinks ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          url: s.url,
          especialidade: s.especialidade?.documentId ?? null,
        })),
      };

      if (link.id !== casesLink.id) return base;

      return {
        ...base,
        sublinks: [
          ...base.sublinks,
          {
            label: especialidade.nome,
            url: '/cases',
            especialidade: especialidade.documentId,
          },
        ],
      };
    });

    await strapi.documents('api::navigation.navigation').update({
      documentId: nav.documentId,
      data: { links: updatedLinks },
      status: 'draft',
    });

    strapi.log.info(`[lifecycle] Sublink "${especialidade.nome}" adicionado ao Navigation.`);
  } catch (err) {
    strapi.log.error('[lifecycle] Falha ao sincronizar sublink no Navigation:', err);
  }
}
