import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import PageHeader from '../components/PageHeader.jsx'
import './QuemSomosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

const cleanStr = (s) => (s || '').replace(/[­​‌‍﻿ ]/g, ' ').replace(/ +/g, ' ').trim()

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
    return value
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

  return (
    <div className="qs-page">

      {/* ── Primeira dobra: header + intro ── */}
      <div className="qs-dobra">
        <PageHeader
          logoUrl={mediaUrl(logo?.logo)}
          label="Quem somos"
          onLogoClick={() => footerRef.current?.scrollIntoView({ behavior: 'smooth' })}
          mobileMenuLogo={logo?.logo}
        />

        <section className="qs-intro">
          <h1 className="qs-intro__titulo">
            {data?.titulo_intro}
          </h1>
          <div
            className="qs-intro__texto"
            dangerouslySetInnerHTML={{ __html: renderRichText(data?.texto_intro) }}
          />
        </section>
      </div>

      {/* ── Imagem full-width ── */}
      {data?.imagem && (
        <div className="qs-imagem">
          <img src={mediaUrl(data.imagem)} alt="" />
        </div>
      )}

      {/* ── Terceira dobra: era (70%) + footer dark (30%) ── */}
      <div className="qs-terceira-dobra" ref={footerRef}>

        <section className="qs-era">
          <div className="qs-era__titulo">
            <span className="qs-era__titulo-normal">
              {data?.titulo_era}
            </span>
            <em className="qs-era__titulo-italico">
              {data?.titulo_era_italico}
            </em>
          </div>
          <div
            className="qs-era__texto"
            dangerouslySetInnerHTML={{ __html: renderRichText(data?.texto_era) }}
          />
        </section>

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

      </div>

      <Menu />

    </div>
  )
}
