import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['pt-BR'],

    translations: {
      'pt-BR': {
        'app.components.LeftMenu.navbrand.title': 'TV1',
        'app.components.LeftMenu.navbrand.workplace': 'CMS',
      },
    },

    head: {
      favicon: '/favicon.png',
    },

    auth: {
      logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" fill="white" style="height:32px">
        <text x="0" y="32" font-family="Arial Black,sans-serif" font-size="38" font-weight="900" font-style="italic">TV1</text>
      </svg>`,
    },

    menu: {
      logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 28" fill="white" style="height:20px">
        <text x="0" y="22" font-family="Arial Black,sans-serif" font-size="26" font-weight="900" font-style="italic">TV1</text>
      </svg>`,
    },

    theme: {
      light: {
        colors: {
          primary100: '#f0f0f0',
          primary200: '#d4d4d4',
          primary500: '#000001',
          primary600: '#000001',
          primary700: '#000001',
          buttonNeutral0: '#ffffff',
          buttonPrimary500: '#000001',
          buttonPrimary600: '#222222',
        },
      },
      dark: {
        colors: {
          primary100: '#1a1a1a',
          primary200: '#2a2a2a',
          primary500: '#ffffff',
          primary600: '#eeeeee',
          primary700: '#dddddd',
          buttonPrimary500: '#ffffff',
          buttonPrimary600: '#dddddd',
        },
      },
    },
  },

  bootstrap(app: StrapiApp) {},
};
