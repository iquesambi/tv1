export default {
  routes: [
    {
      method: 'GET',
      path: '/importar-cloudinary',
      handler: 'cloudinary-import.run',
      config: {
        // Rota pública (sem login do Strapi), protegida por token via query.
        auth: false,
      },
    },
  ],
};
