export default {
  routes: [
    {
      method: 'POST',
      path: '/contato',
      handler: 'contato.enviar',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
