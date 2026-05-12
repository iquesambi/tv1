module.exports = {
  async afterCreate(event) {
    try {
      const { result } = event;
      const cliente = result;

      console.log('🔥 LIFECYCLE afterCreate Cliente:', { id: cliente?.id, nome: cliente?.nome, slug: cliente?.slug });

      if (!cliente || !cliente.slug) {
        console.log('❌ Cliente sem slug, saindo...');
        return;
      }

      console.log('🔍 Buscando navigation...');
      const navigation = await strapi.db.query('api::navigation.navigation').findOne({
        populate: { links: true }
      });

      console.log('✅ Navigation encontrada:', navigation ? 'SIM' : 'NÃO', { links: navigation?.links?.length });

      if (!navigation) {
        console.log('❌ Navigation não existe!');
        return;
      }

      const links = navigation.links || [];
      const existingLink = links.find(l => l.cliente === cliente.id);

      console.log('🔎 Link existente?', existingLink ? 'SIM' : 'NÃO');

      if (!existingLink) {
        console.log('📝 Criando novo link para cliente...');
        const novoLink = {
          label: cliente.nome,
          url: `/${cliente.slug}`,
          cliente: cliente.id,
        };
        console.log('📌 Novo link:', novoLink);
        links.push(novoLink);

        console.log('💾 Atualizando navigation com', links.length, 'links...');
        const result = await strapi.db.query('api::navigation.navigation').update(
          { where: { id: navigation.id } },
          { data: { links } }
        );
        console.log('✅ Sucesso! Navigation atualizada:', result ? 'SIM' : 'NÃO');
      } else {
        console.log('ℹ️  Link já existe, pulando criação');
      }
    } catch (error) {
      console.error('Erro no afterCreate Cliente:', error);
    }
  },

  async afterUpdate(event) {
    try {
      const { result } = event;
      const cliente = result;

      if (!cliente || !cliente.slug) return;

      const navigation = await strapi.db.query('api::navigation.navigation').findOne({
        populate: { links: true }
      });

      if (!navigation) return;

      const links = navigation.links || [];
      const link = links.find(l => l.cliente === cliente.id);

      if (link) {
        link.label = cliente.nome;
        link.url = `/${cliente.slug}`;

        await strapi.db.query('api::navigation.navigation').update(
          { where: { id: navigation.id } },
          { data: { links } }
        );
      }
    } catch (error) {
      console.error('Erro no afterUpdate Cliente:', error);
    }
  },
};
