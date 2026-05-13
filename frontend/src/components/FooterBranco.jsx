import { useEffect, useRef, useState } from 'react'
import { useGoTo } from '../transition.jsx'
import axios from 'axios'
import './FooterBranco.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
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
  const [clientes, setClientes]     = useState(null)
  const [aberto, setAberto]         = useState(null)
  const [hoveredSub, setHoveredSub] = useState(null)
  const [activeSubIdx, setActiveSubIdx] = useState(0)
  const goTo = useGoTo()
  const lastScrollY = useRef(0)
  const scrollLocked = useRef(false)
  const activeSubIdxRef = useRef(0)
  const boundaryAcc = useRef(0)

  // Declarado antes dos useEffects que dependem de links
  const links = nav?.links ?? []

  const getSublinks = (link) => {
    if (link.url === '/pessoas') {
      return (link.sublinks ?? []).map(sub => ({
        label: sub.label,
        url: `/pessoas#${sub.url.replace(/^\//, '')}`,
        imagem_hover: sub.imagem_hover ?? null,
      }))
    }
    if (link.url === '/clientes') {
      return (clientes ?? []).map(c => ({
        label: c.nome,
        url: `/${c.slug}`,
        imagem_hover: link.imagem_hover ?? null,
      }))
    }
    return link.sublinks ?? []
  }

  useEffect(() => {
    api('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=logo&sort=ordem:asc').then(setAgencias)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('quarenta-anos?populate=imagem').then(setQa)
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
    api('clientes?sort=nome:asc').then(setClientes)
  }, [])

  // Fechar menu ao scrollar pra cima
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < lastScrollY.current && aberto !== null) {
        setAberto(null)
        setHoveredSub(null)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [aberto])

  // Reset roleta ao trocar de menu
  useEffect(() => { setActiveSubIdx(0) }, [aberto])

  useEffect(() => { activeSubIdxRef.current = activeSubIdx }, [activeSubIdx])

  // Roleta: wheel scroll dentro do submenu
  const footerLastRoletaTime = useRef(0)
  const footerLastNavTime = useRef(0)

  useEffect(() => {
    if (aberto === null) return
    const link = links[aberto]
    const sublinks = link ? getSublinks(link) : []
    if (sublinks.length === 0) return

    const ROLETA_MS  = 700
    const NAV_THRESH = 400

    const onWheel = (e) => {
      e.preventDefault()

      const direcao = Math.sign(e.deltaY)
      if (direcao === 0) return
      const now = Date.now()

      if (direcao > 0) {
        if (activeSubIdxRef.current < sublinks.length - 1) {
          boundaryAcc.current = 0
          if (now - footerLastRoletaTime.current < ROLETA_MS) return
          footerLastRoletaTime.current = now
          setActiveSubIdx(prev => prev + 1)
          activeSubIdxRef.current += 1
        } else {
          boundaryAcc.current += Math.abs(e.deltaY)
          if (boundaryAcc.current < NAV_THRESH) return
          boundaryAcc.current = 0
          setAberto(aberto < links.length - 1 ? aberto + 1 : null)
          setActiveSubIdx(0)
          activeSubIdxRef.current = 0
        }
      } else {
        if (activeSubIdxRef.current > 0) {
          boundaryAcc.current = 0
          if (now - footerLastRoletaTime.current < ROLETA_MS) return
          footerLastRoletaTime.current = now
          setActiveSubIdx(prev => prev - 1)
          activeSubIdxRef.current -= 1
        } else {
          boundaryAcc.current += Math.abs(e.deltaY)
          if (boundaryAcc.current < NAV_THRESH) return
          boundaryAcc.current = 0
          setAberto(aberto > 0 ? aberto - 1 : null)
          setActiveSubIdx(0)
          activeSubIdxRef.current = 0
        }
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [aberto, links, equipe, clientes])

  const handleLink = (e, i, link) => {
    e.preventDefault()
    // Sempre toggle submenu — nunca navega pelo clique no menu principal
    if (aberto === i) {
      setAberto(null); setHoveredSub(null)
    } else {
      setAberto(i); setHoveredSub(null)
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
            </div>
          )
        })}
      </nav>

      {/* Submenu Roleta - fora do nav (porque nav pode ter transform que quebra position: fixed) */}
      {aberto !== null && (() => {
        const link = links[aberto]
        const sublinks = link ? getSublinks(link) : []
        if (sublinks.length === 0) return null

        const isRoleta = sublinks.length >= 5

        const sizes = sublinks.map((_, j) => {
          if (!isRoleta) return 70
          const d = Math.abs(j - activeSubIdx)
          return d === 0 ? 90 : Math.max(16, 56 - (d - 1) * 12)
        })
        const centers = []
        let acc = 0
        sizes.forEach(h => { centers.push(acc + h / 2); acc += h })
        const totalHeight = acc

        const ratio = links.length > 1 ? aberto / (links.length - 1) : 0.5
        const normalTargetY = window.innerHeight * (0.35 + ratio * 0.27)

        const listShift = isRoleta
          ? window.innerHeight * 0.58 - centers[activeSubIdx]
          : normalTargetY - totalHeight / 2

        return (
          <div className="footer-branco__submenu" onClick={e => e.stopPropagation()}>
            <div
              className="footer-branco__submenu-list"
              style={{ transform: `translate(-50%, ${listShift}px)` }}
            >
              {sublinks.map((sub, j) => {
                const d = Math.abs(j - activeSubIdx)
                const opacity = isRoleta ? Math.max(0.06, 1 - d * 0.18) : 1
                const isActive = j === activeSubIdx
                return (
                  <a
                    key={j}
                    href={sub.url || '#'}
                    className={`footer-branco__submenu-link ${isActive ? 'footer-branco__submenu-link--ativo' : ''}`}
                    style={{ fontSize: `${sizes[j]}px`, opacity }}
                    onMouseEnter={() => setHoveredSub(sub)}
                    onMouseLeave={() => setHoveredSub(null)}
                    onClick={e => {
                      e.preventDefault()
                      if (sub.url) {
                        const [path, hash] = sub.url.split('#')
                        goTo(path || '/', () => {
                          if (hash) window.location.hash = hash
                        })
                      }
                    }}
                  >
                    {sub.label}
                  </a>
                )
              })}
            </div>
          </div>
        )
      })()}

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
