module.exports = {
  async afterCreate(event) {
    try {
      const { result } = event;
      const especialidade = result;

      if (!especialidade || !especialidade.slug) return;

      const navigation = await strapi.db.query('api::navigation.navigation').findOne({
        populate: { links: { populate: { sublinks: true } } }
      });

      if (!navigation || !navigation.links || navigation.links.length === 0) return;

      // Procura em todos os sublinks
      let encontrou = false;
      for (const link of navigation.links) {
        if (!link.sublinks) continue;
        const sublink = link.sublinks.find(s => s.especialidade === especialidade.id);
        if (sublink) {
          encontrou = true;
          break;
        }
      }

      if (!encontrou) {
        // Cria novo sublink no primeiro link
        const primeiroLink = navigation.links[0];
        if (!primeiroLink.sublinks) primeiroLink.sublinks = [];

        primeiroLink.sublinks.push({
          label: especialidade.nome,
          url: `/especialidade/${especialidade.slug}`,
          especialidade: especialidade.id,
        });

        await strapi.db.query('api::navigation.navigation').update(
          { where: { id: navigation.id } },
          { data: { links: navigation.links } }
        );
      }
    } catch (error) {
      console.error('Erro no afterCreate Especialidade:', error);
    }
  },

  async afterUpdate(event) {
    try {
      const { result } = event;
      const especialidade = result;

      if (!especialidade || !especialidade.slug) return;

      const navigation = await strapi.db.query('api::navigation.navigation').findOne({
        populate: { links: { populate: { sublinks: true } } }
      });

      if (!navigation) return;

      // Procura e atualiza
      for (const link of navigation.links || []) {
        for (const sublink of link.sublinks || []) {
          if (sublink.especialidade === especialidade.id) {
            sublink.label = especialidade.nome;
            sublink.url = `/especialidade/${especialidade.slug}`;

            await strapi.db.query('api::navigation.navigation').update(
              { where: { id: navigation.id } },
              { data: { links: navigation.links } }
            );
            return;
          }
        }
      }
    } catch (error) {
      console.error('Erro no afterUpdate Especialidade:', error);
    }
  },
};
