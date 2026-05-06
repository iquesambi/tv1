import { useEffect, useRef, useState } from 'react'
import { useGoTo } from '../transition.jsx'
import axios from 'axios'
import './FooterBranco.css'

const STRAPI = 'http://localhost:1337'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null
const externalUrl = (url) => {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export default function FooterBranco() {
  const [nav, setNav]               = useState(null)
  const [logo, setLogo]             = useState(null)
  const [agencias, setAgencias]     = useState(null)
  const [redes, setRedes]           = useState(null)
  const [qa, setQa]                 = useState(null)
  const [equipe, setEquipe]         = useState(null)
  const [aberto, setAberto]         = useState(null)
  const [hoveredSub, setHoveredSub] = useState(null)
  const goTo = useGoTo()
  const lastScrollY = useRef(0)

  useEffect(() => {
    api('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=logo&sort=ordem:asc').then(setAgencias)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('quarenta-anos?populate=imagem').then(setQa)
    api('equipe?populate[membros][populate]=foto').then(setEquipe)
  }, [])

  // Fechar menu ao scrollar pra cima
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // Se está scrollando pra cima (scrollY diminui) e menu está aberto, fecha
      if (currentScrollY < lastScrollY.current && aberto !== null) {
        setAberto(null)
        setHoveredSub(null)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [aberto])

  const links = nav?.links ?? []

  const getSublinks = (link) => {
    if (link.url === '/pessoas') {
      return (equipe?.membros ?? []).map(m => ({
        label: m.nome,
        url: `/pessoas#${slugify(m.nome)}`,
        imagem_hover: m.foto ?? null,
      }))
    }
    return link.sublinks ?? []
  }

  const handleLink = (e, i, link) => {
    e.preventDefault()
    const sublinks = getSublinks(link)
    if (sublinks.length > 0) {
      setAberto(aberto === i ? null : i)
      setHoveredSub(null)
    } else {
      if (link.url) goTo(link.url)
    }
  }

  return (
    <section
      className={`footer-branco ${aberto !== null ? 'footer-branco--aberto' : ''}`}
      onClick={aberto !== null ? () => { setAberto(null); setHoveredSub(null) } : undefined}
    >

      {/* Backgrounds das imagens de hover */}
      {links.map((link, i) => {
        if (aberto !== i) return null
        const sublinks = getSublinks(link)
        return [
          link.imagem_hover && (
            <div
              key={`${i}-main`}
              className={`footer-branco__bg ${hoveredSub === null ? 'footer-branco__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(link.imagem_hover)} alt="" />
            </div>
          ),
          ...sublinks.map((sub, j) => {
            const img = sub.imagem_hover || link.imagem_hover
            if (!img) return null
            return (
              <div
                key={`${i}-${j}`}
                className={`footer-branco__bg ${hoveredSub === sub ? 'footer-branco__bg--ativo' : ''}`}
              >
                <img src={mediaUrl(img)} alt="" />
              </div>
            )
          }),
        ]
      })}

      {/* Topo: logo esq + câmera dir */}
      <div className="footer-branco__top">
        <div className="footer-branco__logo" onClick={e => e.stopPropagation()}>
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        {qa?.ativo && qa?.imagem && (
          <button className="footer-branco__camera" onClick={(e) => { e.stopPropagation(); goTo('/quarenta-anos') }} aria-label="40 Anos TV1">
            <img src={mediaUrl(qa.imagem)} alt="" />
          </button>
        )}
      </div>

      {/* Centro: nav gigante */}
      <nav className="footer-branco__nav">
        {links.map((link, i) => {
          const esteAberto = aberto === i
          const acima      = aberto !== null && !esteAberto && i < aberto
          const abaixo     = aberto !== null && !esteAberto && i > aberto
          const sublinks   = getSublinks(link)

          return (
            <div
              key={i}
              className={[
                'footer-branco__nav-item',
                esteAberto ? 'footer-branco__nav-item--ativo'  : '',
                acima      ? 'footer-branco__nav-item--acima'  : '',
                abaixo     ? 'footer-branco__nav-item--abaixo' : '',
              ].join(' ')}
              onClick={e => e.stopPropagation()}
            >
              <a
                href={link.url || '#'}
                className={`footer-branco__nav-link ${(acima || abaixo) ? 'footer-branco__nav-link--dimmed' : ''}`}
                onClick={e => handleLink(e, i, link)}
              >
                {link.label}
              </a>

              {esteAberto && sublinks.length > 0 && (
                <div className="footer-branco__submenu">
                  {sublinks.map((sub, j) => (
                    <a
                      key={j}
                      href={sub.url || '#'}
                      className={`footer-branco__submenu-link ${hoveredSub === sub ? 'footer-branco__submenu-link--ativo' : ''}`}
                      onMouseEnter={() => setHoveredSub(sub)}
                      onMouseLeave={() => setHoveredSub(null)}
                      onClick={e => { e.preventDefault(); sub.url && goTo(sub.url) }}
                    >
                      {sub.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Barra inferior */}
      <div className="footer-branco__bottom" onClick={e => e.stopPropagation()}>
        <a href="mailto:contato@tv1.com.br" className="footer-branco__contato">Contato</a>

        <div className={`footer-branco__marcas ${aberto !== null ? 'footer-branco__marcas--oculto' : ''}`}>
          {agencias?.filter(a => a.logo).map((a, i) => (
            <a key={i} href={externalUrl(a.url_externo)} target="_blank" rel="noreferrer">
              <img src={mediaUrl(a.logo)} alt={a.nome} />
            </a>
          ))}
        </div>

        <div className="footer-branco__redes">
          {redes?.redes?.map((rede, i) => (
            <a key={i} href={externalUrl(rede.url)} target="_blank" rel="noreferrer">
              <img src={mediaUrl(rede.icone)} alt="" />
            </a>
          ))}
        </div>
      </div>

    </section>
  )
}
