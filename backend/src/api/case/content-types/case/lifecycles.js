'use strict';

// ancora_id é string (não uid) de propósito: o validador de uid do Strapi
// roda antes de qualquer lifecycle hook e rejeita o save quando o campo
// vem vazio de dentro de um componente ("must be a valid uid attribute"),
// então o hook nunca chegaria a preencher nada. Geramos o slug aqui, a
// partir do titulo, no momento de salvar.

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function preencherAncoraIds(data) {
  if (!Array.isArray(data?.blocos)) return;
  for (const bloco of data.blocos) {
    if (bloco?.__component === 'blocks.subcase' && bloco.titulo && !bloco.ancora_id) {
      bloco.ancora_id = slugify(bloco.titulo);
    }
  }
}

module.exports = {
  beforeCreate(event) {
    preencherAncoraIds(event.params.data);
  },
  beforeUpdate(event) {
    preencherAncoraIds(event.params.data);
  },
};
