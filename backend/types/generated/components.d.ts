import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksBigNumberItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_big_number_items';
  info: {
    displayName: 'Big Number Item';
    icon: 'hashtag';
  };
  attributes: {
    descricao: Schema.Attribute.String & Schema.Attribute.Required;
    numero: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlocksBigNumbers extends Struct.ComponentSchema {
  collectionName: 'components_blocks_big_numbers';
  info: {
    displayName: 'Big Numbers';
    icon: 'hashtag';
  };
  attributes: {
    itens: Schema.Attribute.Component<'blocks.big-number-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
        },
        number
      >;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksFotoBigNumber extends Struct.ComponentSchema {
  collectionName: 'components_blocks_foto_big_numbers';
  info: {
    displayName: 'Foto com Big Number';
    icon: 'picture';
  };
  attributes: {
    imagem: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    numeros: Schema.Attribute.Component<'blocks.big-number-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
        },
        number
      >;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksGaleria extends Struct.ComponentSchema {
  collectionName: 'components_blocks_galerias';
  info: {
    displayName: 'Galeria';
    icon: 'layout';
  };
  attributes: {
    imagens: Schema.Attribute.Media<'images', true>;
    mostrar_foto_completa: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksGaleriaItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_galeria_items';
  info: {
    displayName: 'Galeria Item';
    icon: 'image';
  };
  attributes: {
    imagem: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    ordem: Schema.Attribute.Integer;
  };
}

export interface BlocksImagemSimples extends Struct.ComponentSchema {
  collectionName: 'components_blocks_imagens_simples';
  info: {
    displayName: 'Imagem Simples';
    icon: 'picture';
  };
  attributes: {
    imagem: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    legenda: Schema.Attribute.String;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksImagemTrio extends Struct.ComponentSchema {
  collectionName: 'components_blocks_imagem_trios';
  info: {
    displayName: 'Imagem em 3';
    icon: 'apps';
  };
  attributes: {
    imagem_1: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    imagem_2: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    imagem_3: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    numeros: Schema.Attribute.Component<'blocks.big-number-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
        },
        number
      >;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksSubcase extends Struct.ComponentSchema {
  collectionName: 'components_blocks_subcases';
  info: {
    displayName: 'Subcase';
    icon: 'layout';
  };
  attributes: {
    ancora_id: Schema.Attribute.String;
    Data: Schema.Attribute.Date;
    descricao: Schema.Attribute.Text;
    imagem_capa: Schema.Attribute.Media<'images'>;
    imagem_timeline: Schema.Attribute.Media<'images'>;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    titulo_timeline: Schema.Attribute.String;
    video_url: Schema.Attribute.String;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksSubtitulo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_subtitulos';
  info: {
    displayName: 'Subt\u00EDtulo';
    icon: 'italic';
  };
  attributes: {
    ancora_id: Schema.Attribute.String;
    texto: Schema.Attribute.String & Schema.Attribute.Required;
    timeline: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    timeline_capa: Schema.Attribute.Media<'images'>;
    timeline_data: Schema.Attribute.Date;
    timeline_nome: Schema.Attribute.String;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksTexto extends Struct.ComponentSchema {
  collectionName: 'components_blocks_textos';
  info: {
    displayName: 'Texto';
    icon: 'file';
  };
  attributes: {
    conteudo: Schema.Attribute.RichText & Schema.Attribute.Required;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface BlocksVideo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_videos';
  info: {
    displayName: 'V\u00EDdeo';
    icon: 'play';
  };
  attributes: {
    ancora_id: Schema.Attribute.String;
    capa: Schema.Attribute.Media<'images'>;
    imagem_timeline: Schema.Attribute.Media<'images'>;
    ir_para_timeline: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    titulo: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    visivel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface NavigationLink extends Struct.ComponentSchema {
  collectionName: 'components_navigation_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    sublinks: Schema.Attribute.Component<'navigation.sublink', true>;
    url: Schema.Attribute.String;
  };
}

export interface NavigationSublink extends Struct.ComponentSchema {
  collectionName: 'components_navigation_sublinks';
  info: {
    displayName: 'Sublink';
    icon: 'arrowRight';
  };
  attributes: {
    especialidade: Schema.Attribute.Relation<
      'manyToOne',
      'api::especialidade.especialidade'
    >;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

export interface SocialRede extends Struct.ComponentSchema {
  collectionName: 'components_social_redes';
  info: {
    displayName: 'Rede Social';
    icon: 'earth';
  };
  attributes: {
    icone: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TrabalheConoscoVaga extends Struct.ComponentSchema {
  collectionName: 'components_trabalhe_conosco_vagas';
  info: {
    displayName: 'Vaga';
    icon: 'briefcase';
  };
  attributes: {
    data_expiracao: Schema.Attribute.Date;
    descricao: Schema.Attribute.Text & Schema.Attribute.Required;
    link_aplicacao: Schema.Attribute.String;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.big-number-item': BlocksBigNumberItem;
      'blocks.big-numbers': BlocksBigNumbers;
      'blocks.foto-big-number': BlocksFotoBigNumber;
      'blocks.galeria': BlocksGaleria;
      'blocks.galeria-item': BlocksGaleriaItem;
      'blocks.imagem-simples': BlocksImagemSimples;
      'blocks.imagem-trio': BlocksImagemTrio;
      'blocks.subcase': BlocksSubcase;
      'blocks.subtitulo': BlocksSubtitulo;
      'blocks.texto': BlocksTexto;
      'blocks.video': BlocksVideo;
      'navigation.link': NavigationLink;
      'navigation.sublink': NavigationSublink;
      'social.rede': SocialRede;
      'trabalhe-conosco.vaga': TrabalheConoscoVaga;
    }
  }
}
