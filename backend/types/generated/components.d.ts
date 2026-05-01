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
  };
}

export interface BlocksCapa extends Struct.ComponentSchema {
  collectionName: 'components_blocks_capas';
  info: {
    displayName: 'Imagem Capa';
    icon: 'landscape';
  };
  attributes: {
    imagem: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface BlocksDescricao extends Struct.ComponentSchema {
  collectionName: 'components_blocks_descricoes';
  info: {
    displayName: 'Descri\u00E7\u00E3o';
    icon: 'quote';
  };
  attributes: {
    conteudo: Schema.Attribute.RichText & Schema.Attribute.Required;
  };
}

export interface BlocksGaleria extends Struct.ComponentSchema {
  collectionName: 'components_blocks_galerias';
  info: {
    displayName: 'Galeria';
    icon: 'layout';
  };
  attributes: {
    imagens: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
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
          max: 4;
        },
        number
      >;
  };
}

export interface BlocksSecao extends Struct.ComponentSchema {
  collectionName: 'components_blocks_secoes';
  info: {
    displayName: 'Se\u00E7\u00E3o / \u00C2ncora';
    icon: 'layer';
  };
  attributes: {
    ancora: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlocksSubtitulo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_subtitulos';
  info: {
    displayName: 'Subt\u00EDtulo';
    icon: 'italic';
  };
  attributes: {
    ancora: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    ancora_id: Schema.Attribute.String;
    texto: Schema.Attribute.String & Schema.Attribute.Required;
    timeline: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    timeline_capa: Schema.Attribute.Media<'images'>;
    timeline_data: Schema.Attribute.Date;
    timeline_nome: Schema.Attribute.String;
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
  };
}

export interface BlocksTitulo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_titulos';
  info: {
    displayName: 'T\u00EDtulo';
    icon: 'bold';
  };
  attributes: {
    texto: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlocksVideo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_videos';
  info: {
    displayName: 'V\u00EDdeo';
    icon: 'play';
  };
  attributes: {
    capa: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    legenda: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EdicaoEdicao extends Struct.ComponentSchema {
  collectionName: 'components_edicao_edicoes';
  info: {
    displayName: 'Edi\u00E7\u00E3o';
    icon: 'calendar';
  };
  attributes: {
    ancora: Schema.Attribute.String & Schema.Attribute.Required;
    conteudo: Schema.Attribute.DynamicZone<
      [
        'blocks.titulo',
        'blocks.subtitulo',
        'blocks.texto',
        'blocks.descricao',
        'blocks.capa',
        'blocks.imagem-simples',
        'blocks.galeria',
        'blocks.imagem-trio',
        'blocks.video',
        'blocks.big-numbers',
      ]
    >;
  };
}

export interface EquipeMembro extends Struct.ComponentSchema {
  collectionName: 'components_equipe_membros';
  info: {
    displayName: 'Membro';
    icon: 'user';
  };
  attributes: {
    bio: Schema.Attribute.Text;
    cargo: Schema.Attribute.String;
    foto: Schema.Attribute.Media<'images'>;
    nome: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface MarcaItem extends Struct.ComponentSchema {
  collectionName: 'components_marca_items';
  info: {
    displayName: 'Marca Item';
    icon: 'picture';
  };
  attributes: {
    logo: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavigationLink extends Struct.ComponentSchema {
  collectionName: 'components_navigation_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    imagem_hover: Schema.Attribute.Media<'images' | 'videos'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    sublinks: Schema.Attribute.Component<'navigation.sublink', true>;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavigationSublink extends Struct.ComponentSchema {
  collectionName: 'components_navigation_sublinks';
  info: {
    displayName: 'Sublink';
    icon: 'arrowRight';
  };
  attributes: {
    imagem_hover: Schema.Attribute.Media<'images' | 'videos'>;
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.big-number-item': BlocksBigNumberItem;
      'blocks.big-numbers': BlocksBigNumbers;
      'blocks.capa': BlocksCapa;
      'blocks.descricao': BlocksDescricao;
      'blocks.galeria': BlocksGaleria;
      'blocks.imagem-simples': BlocksImagemSimples;
      'blocks.imagem-trio': BlocksImagemTrio;
      'blocks.secao': BlocksSecao;
      'blocks.subtitulo': BlocksSubtitulo;
      'blocks.texto': BlocksTexto;
      'blocks.titulo': BlocksTitulo;
      'blocks.video': BlocksVideo;
      'edicao.edicao': EdicaoEdicao;
      'equipe.membro': EquipeMembro;
      'marca.item': MarcaItem;
      'navigation.link': NavigationLink;
      'navigation.sublink': NavigationSublink;
      'social.rede': SocialRede;
    }
  }
}
