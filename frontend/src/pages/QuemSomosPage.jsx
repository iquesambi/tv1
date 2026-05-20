import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import Menu from '../components/Menu.jsx'
import MobileMenu from '../components/MobileMenu.jsx'
import './QuemSomosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

function textoParaHtml(texto) {
  if (!texto) return ''
  return texto
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export default function QuemSomosPage() {
  const [data, setData]   = useState(null)
  const [logo, setLogo]   = useState(null)
  const footerRef         = useRef(null)
  const goTo              = useGoTo()

  useEffect(() => {
    document.body.classList.remove('scroll-locked')
    api('logo-site?populate=logo').then(setLogo)
    api('quem-somos?populate[imagem]=true').then(setData)
  }, [])

  const pronto = data !== null && logo !== null

  if (!pronto) return (
    <div className="qs-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="qs-spinner" />
    </div>
  )

  return (
    <div className="qs-page">

      {/* ── Header ── */}
      <header className="qs-header">
        <button className="qs-header__logo" onClick={() => footerRef.current?.scrollIntoView({ behavior: 'smooth' })} aria-label="Home">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </button>
        <span className="qs-header__label">Quem somos</span>
        <MobileMenu logo={logo?.logo} logoFiltro="brightness(0)" />
      </header>

      {/* ── Seção intro ── */}
      <section className="qs-intro">
        <h1 className="qs-intro__titulo">
          {data?.titulo_intro || 'Quem somos'}
        </h1>
        <div
          className="qs-intro__texto"
          dangerouslySetInnerHTML={{ __html: textoParaHtml(data?.texto_intro || '') }}
        />
      </section>

      {/* ── Imagem full-width ── */}
      {data?.imagem && (
        <div className="qs-imagem">
          <img src={mediaUrl(data.imagem)} alt="" />
        </div>
      )}

      {/* ── Seção "Da era da..." ── */}
      <section className="qs-era">
        <div className="qs-era__titulo">
          <span className="qs-era__titulo-normal">
            {data?.titulo_era || 'Da era da comunicação à era da'}
          </span>
          <em className="qs-era__titulo-italico">
            {data?.titulo_era_italico || 'experiência.'}
          </em>
        </div>
        <div
          className="qs-era__texto"
          dangerouslySetInnerHTML={{ __html: textoParaHtml(data?.texto_era || '') }}
        />
      </section>

      {/* ── Footer dark ── */}
      <div ref={footerRef}>
        <section className="qs-footer-dark">
          {logo?.logo && (
            <img
              src={mediaUrl(logo.logo)}
              alt="TV1"
              className="qs-footer-dark__logo"
            />
          )}
          <p className="qs-footer-dark__tagline">
            {data?.tagline || 'Content driven.\nTech inspired.'}
          </p>
        </section>
        <Menu />
      </div>

    </div>
  )
}
