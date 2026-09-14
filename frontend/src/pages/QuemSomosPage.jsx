import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import PageHeader from '../components/PageHeader.jsx'
import './QuemSomosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

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
          .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
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
    .replace(/\*{1,3}([\s\S]+?)\*{1,3}/g, (_, trecho) => italico(trecho))
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
    api('quem-somos?populate[imagem]=true').then(r => setData(r ?? null))
  }, [])

  const pronto = data !== undefined && logo !== undefined

  if (!pronto) return (
    <div className="qs-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="qs-spinner" />
    </div>
  )

  // Cada bloco tem seu liga/desliga no CMS. Campo vazio (conteúdo antigo,
  // antes dos toggles existirem) conta como ligado.
  const mostrarIntro         = data?.mostrar_intro !== false
  const mostrarImagem        = data?.mostrar_imagem !== false && !!data?.imagem
  const mostrarEra           = data?.mostrar_era !== false
  const mostrarContentDriven = data?.mostrar_content_driven !== false

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
                __html: renderTitulo(data?.titulo_intro, 'qs-intro__titulo-italico'),
              }}
            />
            <div
              className="qs-intro__texto"
              dangerouslySetInnerHTML={{ __html: renderRichText(data?.texto_intro) }}
            />
          </section>
        )}
      </div>

      {/* ── Bloco 2: foto de largura total ── */}
      {mostrarImagem && (
        <div className="qs-imagem">
          <img src={mediaUrl(data.imagem)} alt="" />
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
                  __html: renderTitulo(data?.titulo_era, 'qs-era__titulo-italico'),
                }}
              />
              <div
                className="qs-era__texto"
                dangerouslySetInnerHTML={{ __html: renderRichText(data?.texto_era) }}
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
                {data?.tagline}
              </p>
            </section>
          )}

        </div>
      )}

      <div ref={footerRef}><Menu /></div>

    </div>
  )
}
