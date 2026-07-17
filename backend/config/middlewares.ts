import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',

  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Mídia vem do Cloudinary — sem isso, o CSP padrão do Strapi só
          // libera market-assets.strapi.io e as miniaturas no admin (media
          // library, listagem de Cases etc.) ficam quebradas.
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', 'res.cloudinary.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com'],
        },
      },
    },
  },

  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'https://tv1-site.web.app',
        'https://tv1-site.firebaseapp.com',
        'https://tv1.com.br',
        'https://www.tv1.com.br',
        'https://slacking-stylized-scheme.ngrok-free.dev',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: '*',
      credentials: true,
    },
  },

  'strapi::poweredBy',
  'strapi::query',
  { name: 'strapi::body', config: { jsonLimit: '10mb', formLimit: '10mb' } },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;