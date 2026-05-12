// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {

    // Listener para Cliente
    strapi.db.lifecycles.subscribe({
      models: ['api::cliente.cliente'],
      async afterCreate(event) {
        try {
          const { result } = event;
          console.log('🔥 [CLIENTE CRIADO]', { id: result?.id, nome: result?.nome, slug: result?.slug });

          if (!result?.slug) return;

          const nav = await strapi.db.query('api::navigation.navigation').findOne({
            populate: { links: { populate: { sublinks: true } } }
          });

          if (!nav?.links?.length) return;

          // Procura o link "Clientes"
          const clientesLink = nav.links.find(l => l.label?.toLowerCase().includes('cliente'));

          if (!clientesLink) return;

          // Verifica se o sublink já existe
          if ((clientesLink.sublinks || []).some(s => s.label === result.nome)) return;

          // Cria o sublink
          if (!clientesLink.sublinks) clientesLink.sublinks = [];
          clientesLink.sublinks.push({
            label: result.nome,
            url: `/${result.slug}`,
          });

          await strapi.entityService.update('api::navigation.navigation', nav.id, {
            data: { links: nav.links }
          });
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },

      async afterUpdate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;

          const nav = await strapi.db.query('api::navigation.navigation').findOne({
            populate: { links: true }
          });

          if (!nav) {
            console.log('❌ Navigation não existe');
            return;
          }

          const link = (nav.links || []).find(l => l.cliente === result.id);
          if (link) {
            console.log('🔄 Atualizando link...');
            link.label = result.nome;
            link.url = `/${result.slug}`;

            await strapi.entityService.update('api::navigation.navigation', nav.id, {
              data: { links: nav.links }
            });
            console.log('✅ Link atualizado!');
          } else {
            console.log('ℹ️  Link não encontrado para atualizar');
          }
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },
    });

    // Listener para Pessoa
    strapi.db.lifecycles.subscribe({
      models: ['api::pessoa.pessoa'],
      async afterCreate(event) {
        try {
          const { result } = event;
          console.log('🔥 [PESSOA CRIADA]', { id: result?.id, nome: result?.nome, slug: result?.slug });

          if (!result?.slug) return;

          const nav = await strapi.db.query('api::navigation.navigation').findOne({
            populate: { links: { populate: { sublinks: true } } }
          });

          if (!nav?.links?.length) return;

          // Procura o link "Pessoas"
          const pessoasLink = nav.links.find(l => l.label?.toLowerCase().includes('pessoa'));

          if (!pessoasLink) return;

          // Verifica se o sublink já existe
          if ((pessoasLink.sublinks || []).some(s => s.label === result.nome)) return;

          // Cria o sublink
          if (!pessoasLink.sublinks) pessoasLink.sublinks = [];
          pessoasLink.sublinks.push({
            label: result.nome,
            url: `/${result.slug}`,
          });

          await strapi.entityService.update('api::navigation.navigation', nav.id, {
            data: { links: nav.links }
          });
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },

      async afterUpdate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;

          const nav = await strapi.db.query('api::navigation.navigation').findOne({
            populate: { links: true }
          });

          if (!nav) return;

          const link = (nav.links || []).find(l => l.pessoa === result.id);
          if (link) {
            link.label = result.nome;
            link.url = `/${result.slug}`;

            await strapi.db.query('api::navigation.navigation').update(
              { where: { id: nav.id } },
              { data: { links: nav.links } }
            );
            console.log('✅ Link de pessoa atualizado!');
          }
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },
    });

    // Listener para Especialidade
    strapi.db.lifecycles.subscribe({
      models: ['api::especialidade.especialidade'],
      async afterCreate(event) {
        try {
          const { result } = event;
          console.log('🔥 [ESPECIALIDADE CRIADA]', { id: result?.id, nome: result?.nome, slug: result?.slug });

          if (!result?.slug) return;

          const nav = await strapi.db.query('api::navigation.navigation').findOne({
            populate: { links: { populate: { sublinks: true } } }
          });

          if (!nav?.links?.length) return;

          let found = false;
          for (const link of nav.links) {
            if ((link.sublinks || []).some(s => s.especialidade === result.id)) {
              found = true;
              break;
            }
          }

          if (!found) {
            const firstLink = nav.links[0];
            if (!firstLink.sublinks) firstLink.sublinks = [];

            firstLink.sublinks.push({
              label: result.nome,
              url: `/especialidade/${result.slug}`,
              especialidade: result.id,
            });

            await strapi.db.query('api::navigation.navigation').update(
              { where: { id: nav.id } },
              { data: { links: nav.links } }
            );
            console.log('✅ Sublink criado!');
          }
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },

      async afterUpdate(event) {
        try {
          const { result } = event;
          if (!result?.slug) return;

          const nav = await strapi.db.query('api::navigation.navigation').findOne({
            populate: { links: { populate: { sublinks: true } } }
          });

          if (!nav) return;

          for (const link of nav.links || []) {
            for (const sublink of link.sublinks || []) {
              if (sublink.especialidade === result.id) {
                sublink.label = result.nome;
                sublink.url = `/especialidade/${result.slug}`;

                await strapi.db.query('api::navigation.navigation').update(
                  { where: { id: nav.id } },
                  { data: { links: nav.links } }
                );
                console.log('✅ Sublink atualizado!');
                return;
              }
            }
          }
        } catch (err) {
          console.error('❌ Erro:', err.message);
        }
      },
    });
  },
};
