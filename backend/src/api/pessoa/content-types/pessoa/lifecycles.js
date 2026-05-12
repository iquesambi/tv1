module.exports = {
  async afterCreate(event) {
    try {
      const { result } = event;
      const pessoa = result;

      if (!pessoa || !pessoa.slug) return;

      const navigation = await strapi.db.query('api::navigation.navigation').findOne({
        populate: { links: true }
      });

      if (!navigation) return;

      const links = navigation.links || [];
      const existingLink = links.find(l => l.pessoa === pessoa.id);

      if (!existingLink) {
        links.push({
          label: pessoa.nome,
          url: `/${pessoa.slug}`,
          pessoa: pessoa.id,
        });

        await strapi.db.query('api::navigation.navigation').update(
          { where: { id: navigation.id } },
          { data: { links } }
        );
      }
    } catch (error) {
      console.error('Erro no afterCreate Pessoa:', error);
    }
  },

  async afterUpdate(event) {
    try {
      const { result } = event;
      const pessoa = result;

      if (!pessoa || !pessoa.slug) return;

      const navigation = await strapi.db.query('api::navigation.navigation').findOne({
        populate: { links: true }
      });

      if (!navigation) return;

      const links = navigation.links || [];
      const link = links.find(l => l.pessoa === pessoa.id);

      if (link) {
        link.label = pessoa.nome;
        link.url = `/${pessoa.slug}`;

        await strapi.db.query('api::navigation.navigation').update(
          { where: { id: navigation.id } },
          { data: { links } }
        );
      }
    } catch (error) {
      console.error('Erro no afterUpdate Pessoa:', error);
    }
  },
};
