import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import './MobileMenu.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`
const externalUrl = (url) => {
  if (!url) return '#'
  if (url.startsWith('/')) return url
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export default function MobileMenu({ logo, logoFiltro = 'brightness(0)' }) {
  const [aberto, setAberto] = useState(false)
  const [agencias, setAgencias] = useState(null)
  const [redes, setRedes]   = useState(null)
  const goTo = useGoTo()

  useEffect(() => {
    api('agencias?populate=*&sort=posicao:asc').then(setAgencias)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
  }, [])

  return (
    <>
      {/* Botão hamburguer */}
      <button
        className="mobile-menu__btn"
        onClick={() => setAberto(true)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Overlay */}
      <div
        className={`mobile-menu__overlay ${aberto ? 'mobile-menu__overlay--aberto' : ''}`}
        onClick={() => setAberto(false)}
      >
        <div className="mobile-menu__inner" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="mobile-menu__header">
            <div
              className="mobile-menu__logo"
              onClick={() => { goTo('/'); setAberto(false) }}
              style={{ cursor: 'pointer' }}
            >
              {logo && <img src={mediaUrl(logo)} alt="TV1" style={{ filter: logoFiltro }} />}
            </div>
            <button className="mobile-menu__fechar" onClick={() => setAberto(false)}>✕</button>
          </div>

          {/* Nav */}
          <nav className="mobile-menu__nav">
            <button className="mobile-menu__nav-link" onClick={() => { goTo('/contato'); setAberto(false) }}>
              Seja cliente
            </button>
            <button className="mobile-menu__nav-link" onClick={() => { goTo('/contato/trabalhe-conosco/formulario'); setAberto(false) }}>
              Trabalhe conosco
            </button>
            <button className="mobile-menu__nav-link" onClick={() => { goTo('/contato/outros-assuntos'); setAberto(false) }}>
              Outros assuntos
            </button>
          </nav>

          {/* Marcas */}
          <div className="mobile-menu__marcas">
            {agencias?.filter(a => a.logo).map((a, i) => (
              <a key={i} href={externalUrl(a.url_externa)} target={!a.url_externa?.startsWith('/') && a.abrir_nova_aba !== false ? '_blank' : undefined} rel={!a.url_externa?.startsWith('/') && a.abrir_nova_aba !== false ? 'noreferrer' : undefined} onClick={a.url_externa?.startsWith('/') ? (e) => { e.preventDefault(); goTo(a.url_externa); setAberto(false) } : undefined}>
                <img src={mediaUrl(a.logo)} alt={a.nome} />
              </a>
            ))}
          </div>

          {/* Redes */}
          <div className="mobile-menu__redes">
            {redes?.redes?.map((rede, i) => (
              <a key={i} href={externalUrl(rede.url)} target="_blank" rel="noreferrer">
                <img src={mediaUrl(rede.icone)} alt="" />
              </a>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
