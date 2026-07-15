import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  locales: ['pt-BR'],
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  preview: {
    enabled: true,
    config: {
      allowedOrigins: env('CLIENT_URL'),
      async handler(uid: string, { documentId, status }: { documentId: string; locale?: string; status: string }) {
        // Preview só existe pra Cases por enquanto.
        if (uid !== 'api::case.case') return null;

        const caso: any = await strapi.documents('api::case.case').findOne({
          documentId,
          status: status === 'draft' ? 'draft' : 'published',
          populate: { cliente: { fields: ['slug'] } },
        });
        if (!caso?.slug) return null;

        const pathname = caso.cliente?.slug ? `/${caso.cliente.slug}/${caso.slug}` : `/${caso.slug}`;
        const params = new URLSearchParams({
          documentId,
          status,
          token: env('PREVIEW_SECRET'),
        });
        return `${env('CLIENT_URL')}${pathname}?${params}`;
      },
    },
  },
});

export default config;
