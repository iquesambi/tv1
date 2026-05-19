import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import './MobileMenu.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`
const externalUrl = (url) => {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export default function MobileMenu({ logo, logoFiltro = 'brightness(0)' }) {
  const [aberto, setAberto] = useState(false)
  const [nav, setNav]       = useState(null)
  const [agencias, setAgencias] = useState(null)
  const [redes, setRedes]   = useState(null)
  const [equipe, setEquipe] = useState(null)
  const [clientes, setClientes] = useState(null)
  const goTo = useGoTo()

  useEffect(() => {
    api('navigation?populate[links][populate]=*').then(setNav)
    api('agencias?populate=*&sort=posicao:asc').then(setAgencias)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
    api('clientes?sort=nome:asc').then(setClientes)
  }, [])

  const links = nav?.links ?? []

  const getSublinks = (link) => {
    if (link.url === '/pessoas') {
      return (link.sublinks ?? []).map(sub => ({
        label: sub.label,
        url: `/pessoas#${sub.url.replace(/^\//, '')}`,
      }))
    }
    if (link.url === '/clientes') {
      return (clientes ?? []).map(c => ({
        label: c.nome,
        url: `/${c.slug}`,
      }))
    }
    return link.sublinks ?? []
  }

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
            <div className="mobile-menu__logo">
              {logo && <img src={mediaUrl(logo)} alt="TV1" style={{ filter: logoFiltro }} />}
            </div>
            <button className="mobile-menu__fechar" onClick={() => setAberto(false)}>✕</button>
          </div>

          {/* Nav */}
          <nav className="mobile-menu__nav">
            {links.map((link, i) => {
              const sublinks = getSublinks(link)
              return (
                <button
                  key={i}
                  className="mobile-menu__nav-link"
                  onClick={() => {
                    if (sublinks.length === 0 && link.url) {
                      goTo(link.url)
                      setAberto(false)
                    }
                  }}
                >
                  {link.label}
                </button>
              )
            })}
            <button
              className="mobile-menu__nav-link"
              onClick={() => { goTo('/contato'); setAberto(false) }}
            >
              Contato
            </button>
          </nav>

          {/* Marcas */}
          <div className="mobile-menu__marcas">
            {agencias?.filter(a => a.logo).map((a, i) => (
              <a key={i} href={externalUrl(a.url_externo)} target="_blank" rel="noreferrer">
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
