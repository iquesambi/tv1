export default {
  register() {},

  bootstrap({ strapi }) {

    strapi.db.lifecycles.subscribe({
      models: ['api::especialidade.especialidade'],

      async afterCreate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;
          console.log('🔥 [ESPECIALIDADE CRIADA]', result.nome);

          const nav = await strapi.documents('api::navigation.navigation').findFirst({
            populate: { links: { populate: { sublinks: true } } },
          });

          if (!nav) return console.log('❌ Navigation não encontrada');

          const casesLink = nav.links?.find(l => l.label?.toLowerCase() === 'cases');
          if (!casesLink) return console.log('❌ Link "Cases" não encontrado');

          const jaExiste = casesLink.sublinks?.some(s => s.url === `/cases/${result.slug}`);
          if (jaExiste) return console.log('ℹ️  Sublink já existe');

          casesLink.sublinks = [...(casesLink.sublinks ?? []), {
            label: result.nome,
            url: `/cases/${result.slug}`,
          }];

          await strapi.documents('api::navigation.navigation').update({
            documentId: nav.documentId,
            data: { links: nav.links },
          });

          console.log('✅ Sublink criado:', result.nome);
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },

      async afterUpdate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;

          const nav = await strapi.documents('api::navigation.navigation').findFirst({
            populate: { links: { populate: { sublinks: true } } },
          });

          if (!nav) return;

          const casesLink = nav.links?.find(l => l.label?.toLowerCase() === 'cases');
          if (!casesLink) return;

          const sublink = casesLink.sublinks?.find(s => s.label === result.nome || s.url?.includes(result.slug));
          if (!sublink) return;

          sublink.label = result.nome;
          sublink.url = `/cases/${result.slug}`;

          await strapi.documents('api::navigation.navigation').update({
            documentId: nav.documentId,
            data: { links: nav.links },
          });

          console.log('✅ Sublink atualizado:', result.nome);
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::pessoa.pessoa'],

      async afterCreate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;
          console.log('🔥 [PESSOA CRIADA]', result.nome);

          const nav = await strapi.documents('api::navigation.navigation').findFirst({
            populate: { links: { populate: { sublinks: true } } },
          });

          if (!nav) return console.log('❌ Navigation não encontrada');

          const pessoasLink = nav.links?.find(l => l.label?.toLowerCase() === 'pessoas');
          if (!pessoasLink) return console.log('❌ Link "Pessoas" não encontrado');

          const jaExiste = pessoasLink.sublinks?.some(s => s.url?.includes(result.slug));
          if (jaExiste) return console.log('ℹ️  Sublink já existe');

          pessoasLink.sublinks = [...(pessoasLink.sublinks ?? []), {
            label: result.nome,
            url: `/pessoas#${result.slug}`,
          }];

          await strapi.documents('api::navigation.navigation').update({
            documentId: nav.documentId,
            data: { links: nav.links },
          });

          console.log('✅ Sublink criado:', result.nome);
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },

      async afterUpdate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;

          const nav = await strapi.documents('api::navigation.navigation').findFirst({
            populate: { links: { populate: { sublinks: true } } },
          });

          if (!nav) return;

          const pessoasLink = nav.links?.find(l => l.label?.toLowerCase() === 'pessoas');
          if (!pessoasLink) return;

          const sublink = pessoasLink.sublinks?.find(s => s.url?.includes(result.slug) || s.label === result.nome);
          if (!sublink) return;

          sublink.label = result.nome;
          sublink.url = `/pessoas#${result.slug}`;

          await strapi.documents('api::navigation.navigation').update({
            documentId: nav.documentId,
            data: { links: nav.links },
          });

          console.log('✅ Sublink atualizado:', result.nome);
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },
    });

  },
};
