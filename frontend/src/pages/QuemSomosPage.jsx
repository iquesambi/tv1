import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import PageHeader from '../components/PageHeader.jsx'
import './QuemSomosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

const QS_BLOCOS =
  'quem-somos?populate[abertura]=true&populate[foto][populate][imagem]=true' +
  '&populate[da_era]=true&populate[content_driven]=true'

const cleanStr = (s) => (s || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').replace(/[­​‌‍﻿ ]/g, ' ').replace(/ +/g, ' ').trim()

// Suporta Markdown (Strapi richtext), HTML string, e blocks JSON (Strapi v5)
function renderRichText(value) {
  if (!value) return ''

  // blocks JSON array (Strapi v5 blocks type)
  if (Array.isArray(value)) {
    return value.map(block => {
      if (block.type === 'paragraph') {
        const inner = (block.children || []).map(child => {
          if (child.type === 'linebreak') return '<br>'
          const text = cleanStr(child.text || '').replace(/\n/g, '<br>')
          if (child.bold && child.italic) return `<strong><em>${text}</em></strong>`
          if (child.bold)   return `<strong>${text}</strong>`
          if (child.italic) return `<em>${text}</em>`
          return text
        }).join('')
        return `<p>${inner}</p>`
      }
      if (block.type === 'heading') {
        const lvl = block.level || 2
        const inner = (block.children || []).map(c => c.text || '').join('')
        return `<h${lvl}>${inner}</h${lvl}>`
      }
      return ''
    }).join('')
  }

  // string: pode ser Markdown ou HTML
  if (typeof value === 'string') {
    // Se já tem tags HTML, usa directamente
    if (/<[a-z][\s\S]*>/i.test(value)) return value
    // Caso contrário, converte Markdown básico
    return cleanStr(value)
      .split(/\n\n+/)
      .map(para => {
        const html = para
          .replace(/\n/g, '<br>')
          // O editor do Strapi usa _ pra itálico, não só *
          .replace(/(\*{3}|_{3})(.+?)\1/g, '<strong><em>$2</em></strong>')
          .replace(/(\*{2}|_{2})(.+?)\1/g, '<strong>$2</strong>')
          .replace(/(\*|_)(.+?)\1/g, '<em>$2</em>')
        return `<p>${html}</p>`
      })
      .join('')
  }

  return ''
}

// Títulos de fonte mista: em vez de um campo por fonte, o CMS tem um rich
// text só e quem escreve marca o trecho que deve sair na serifada itálica.
// Negrito e itálico caem no mesmo tratamento de propósito — o título só
// tem duas fontes, então qualquer marcação leva à mesma, e não tem como
// errar o botão no editor.
function renderTitulo(valor, classeItalico) {
  if (!valor) return ''
  // Os espaços das bordas ficam FORA do <em>: o editor do Strapi costuma
  // incluí-los na seleção, e dentro eles sairiam no corpo da serifada
  // (que é maior), deixando o vão entre as duas partes errado.
  const italico = (trecho) => {
    const [, antes, miolo, depois] = trecho.match(/^(\s*)([\s\S]*?)(\s*)$/)
    return miolo ? `${antes}<em class="${classeItalico}">${miolo}</em>${depois}` : trecho
  }
  return cleanStr(String(valor))
    // O editor do Strapi usa _ pra itálico e ** pra negrito. A
    // retrorreferência garante que o marcador de fechamento é igual ao de
    // abertura, em vez de casar "*texto**".
    .replace(/(\*{1,3}|_{1,3})([\s\S]+?)\1/g, (_, __, trecho) => italico(trecho))
    // Se vier HTML pronto em vez de markdown
    .replace(/<(strong|em|b|i)>([\s\S]*?)<\/\1>/gi, (_, __, trecho) => italico(trecho))
}

export default function QuemSomosPage() {
  const [data, setData]   = useState(undefined)
  const [logo, setLogo]   = useState(undefined)
  const footerRef         = useRef(null)

  useEffect(() => {
    document.body.classList.remove('scroll-locked')
    api('logo-site?populate=logo').then(r => setLogo(r ?? null))
    api(QS_BLOCOS).then(r => setData(r ?? null))
  }, [])

  const pronto = data !== undefined && logo !== undefined

  if (!pronto) return (
    <div className="qs-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="qs-spinner" />
    </div>
  )

  // Um componente por bloco da página (ver o schema do quem-somos).
  const abertura      = data?.abertura       ?? {}
  const foto          = data?.foto           ?? {}
  const daEra         = data?.da_era         ?? {}
  const contentDriven = data?.content_driven ?? {}

  const tituloIntro  = abertura.titulo
  const tituloAcima  = abertura.titulo_acima
  const textoIntro   = abertura.texto
  const tituloAbaixo = abertura.titulo_abaixo
  const imagem       = foto.imagem
  const tituloEra    = daEra.titulo
  const textoEra     = daEra.texto
  const tagline      = contentDriven.tagline

  // Liga/desliga de cada bloco. Vazio conta como ligado.
  const mostrarIntro         = abertura.mostrar      !== false
  const mostrarImagem        = foto.mostrar          !== false && !!imagem
  const mostrarEra           = daEra.mostrar         !== false
  const mostrarContentDriven = contentDriven.mostrar !== false

  return (
    <div className="qs-page">

      {/* ── Bloco 1: intro (o header fica sempre, é a navegação) ── */}
      <div className={`qs-dobra${mostrarIntro ? '' : ' qs-dobra--so-header'}`}>
        <PageHeader
          logoUrl={mediaUrl(logo?.logo)}
          onLogoClick={() => footerRef.current?.scrollIntoView({ behavior: 'smooth' })}
          mobileMenuLogo={logo?.logo}
        />

        {mostrarIntro && (
          <section className="qs-intro">
            <h1
              className="qs-intro__titulo"
              dangerouslySetInnerHTML={{
                __html: renderTitulo(tituloIntro, 'qs-intro__titulo-italico'),
              }}
            />
            <div className="qs-intro__coluna">
              {tituloAcima && (
                <div
                  className="qs-intro__destaque"
                  dangerouslySetInnerHTML={{
                    __html: renderTitulo(tituloAcima, 'qs-intro__destaque-italico'),
                  }}
                />
              )}
              <div
                className="qs-intro__texto"
                dangerouslySetInnerHTML={{ __html: renderRichText(textoIntro) }}
              />
              {tituloAbaixo && (
                <div
                  className="qs-intro__destaque"
                  dangerouslySetInnerHTML={{
                    __html: renderTitulo(tituloAbaixo, 'qs-intro__destaque-italico'),
                  }}
                />
              )}
            </div>
          </section>
        )}
      </div>

      {/* ── Bloco 2: foto de largura total ── */}
      {mostrarImagem && (
        <div className="qs-imagem">
          <img src={mediaUrl(imagem)} alt="" />
        </div>
      )}

      {/* ── Blocos 3 e 4: "da era" (70%) + faixa preta (30%). Sozinho,
             qualquer um dos dois ocupa a dobra inteira (ver CSS). ── */}
      {(mostrarEra || mostrarContentDriven) && (
        <div className="qs-terceira-dobra">

          {mostrarEra && (
            <section className="qs-era">
              <div
                className="qs-era__titulo"
                dangerouslySetInnerHTML={{
                  __html: renderTitulo(tituloEra, 'qs-era__titulo-italico'),
                }}
              />
              <div
                className="qs-era__texto"
                dangerouslySetInnerHTML={{ __html: renderRichText(textoEra) }}
              />
            </section>
          )}

          {mostrarContentDriven && (
            <section className="qs-footer-dark">
              {logo?.logo && (
                <img
                  src={mediaUrl(logo.logo)}
                  alt="TV1"
                  className="qs-footer-dark__logo"
                />
              )}
              <p className="qs-footer-dark__tagline">
                {tagline}
              </p>
            </section>
          )}

        </div>
      )}

      <div ref={footerRef}><Menu /></div>

    </div>
  )
}
