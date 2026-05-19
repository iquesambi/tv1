import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useGoTo, useStartCamera } from '../transition.jsx'
import '../App.css'
import './Menu.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`
const externalUrl = (url) => {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

// Dados pré-carregados em build time pelo scripts/prefetch.js
// Em dev (sem build) ficam null e o fetch normal é usado
const _pf = window.__TV1_DATA__ ?? {}

const SUBMENU_VISIBLE = 7
const ITEM_H_D = 70
const ITEM_H_M = 46
const WIN_PAD  = 48

// Escala proporcional de logos: maior logo natural (20px) → 24px target
const MAX_NATURAL = 20
const TARGET_H    = 24

function AgenciaLogos({ agencias, className }) {
  return (
    <div className={className}>
      {agencias?.filter(a => a.logo).map((a, i) => {
        const naturalH = a.logo.height || 17
        const naturalW = a.logo.width  || 60
        const renderH  = Math.round(naturalH * (TARGET_H / MAX_NATURAL))
        const renderW  = Math.round(naturalW * (TARGET_H / MAX_NATURAL))
        return (
          <a key={i} href={externalUrl(a.url_externo)} target="_blank" rel="noreferrer">
            <img src={mediaUrl(a.logo)} alt={a.nome} style={{ height: renderH, width: renderW }} />
          </a>
        )
      })}
    </div>
  )
}

export default function Menu({ isHome = false, variant = 'claro', semMarcas = false, footerHome = false }) {
  const escuro = !isHome && variant === 'escuro'
  const p = isHome ? 'home' : 'footer-branco'

  // Estado compartilhado
  const [nav, setNav]               = useState(isHome ? (_pf.nav ?? null) : null)
  const [logo, setLogo]             = useState(isHome ? (_pf.logo ?? null) : null)
  const [agencias, setAgencias]     = useState(isHome ? (_pf.agencias ?? null) : null)
  const [redes, setRedes]           = useState(isHome ? (_pf.redes ?? null) : null)
  const [equipe, setEquipe]         = useState(null)
  const [clientes, setClientes]     = useState(null)
  const [aberto, setAberto]         = useState(null)
  const [hoveredSub, setHoveredSub] = useState(null)
  const [activeSubIdx, setActiveSubIdx] = useState(0)

  // Estado exclusivo da home
  const [quarentaAnos, setQA]   = useState(isHome ? (_pf.quarentaAnos ?? null) : null)
  const [menuMobile, setMenuMobile] = useState(false)
  // pronto: footer sempre pronto; home espera preloader; footerHome também pronto de imediato
  const [pronto, setPronto] = useState(!isHome || footerHome)

  // useLocation só funciona se houver Router acima — na home há, no footer também (dentro do Router)
  const location = useLocation()
  const contatoAberto = isHome ? location.pathname.startsWith('/contato') : false

  const goTo       = useGoTo()
  const startCamera = useStartCamera()

  const lastScrollY     = useRef(0)
  const touchStartY     = useRef(null)
  const touchAccDelta   = useRef(0)
  const touchTotalMoved = useRef(0)
  const activeSubIdxRef = useRef(0)
  const boundaryAcc     = useRef(0)
  const lastRoletaTime  = useRef(0)
  const lastNavTime     = useRef(0)

  const links = nav?.links ?? []

  // Sublinks dinâmicos
  const getSublinks = (link) => {
    if (link.label?.toLowerCase() === 'pessoas') {
      return (equipe ?? []).map(p => ({
        label: p.nome,
        url: `/pessoas#${p.slug}`,
        imagem_hover: null,
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

  // Fetch de dados
  useEffect(() => {
    api('navigation?populate[links][populate]=*').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=*&sort=posicao:asc').then(data =>
      setAgencias(Array.isArray(data) ? data.map(a => ({ ...a, logo: a.Logo ?? a.logo, nome: a.Nome ?? a.nome, slug: a.Slug ?? a.slug })) : [])
    )
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('quarenta-anos?populate=imagem').then(r => { if (isHome) setQA(r); else setQA(r) })
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
    api('clientes?sort=nome:asc&populate[logo]=true').then(setClientes)

    if (isHome) {
      // Pré-carrega imagens salvas da visita anterior
      try {
        const saved = JSON.parse(localStorage.getItem('tv1-home-imgs') ?? '[]')
        saved.forEach(url => { const i = new Image(); i.src = url })
      } catch {}
    }
  }, [])

  // Fallback: garante que o preloader nunca trava se alguma API falhar
  useEffect(() => {
    if (!isHome) return
    const t = setTimeout(() => setPronto(true), 7000)
    return () => clearTimeout(t)
  }, [])

  // Preloader (home only)
  useEffect(() => {
    if (!isHome) return
    if (!logo || !agencias || !redes || !nav) return

    const urls = [
      mediaUrl(logo?.logo),
      mediaUrl(quarentaAnos?.imagem),
      ...(agencias ?? []).filter(a => a.logo).map(a => mediaUrl(a.logo)),
      ...(redes?.redes ?? []).filter(r => r.icone).map(r => mediaUrl(r.icone)),
      ...(nav?.links ?? []).flatMap(link => [
        link.imagem_hover ? mediaUrl(link.imagem_hover) : null,
        ...(link.sublinks ?? []).map(sub => sub.imagem_hover ? mediaUrl(sub.imagem_hover) : null),
      ]),
    ].filter(Boolean)

    try { localStorage.setItem('tv1-home-imgs', JSON.stringify(urls)) } catch {}

    if (urls.length === 0) { setPronto(true); return }

    const timeout = setTimeout(() => setPronto(true), 5000)
    let count = 0
    const done = () => { if (++count >= urls.length) { clearTimeout(timeout); setPronto(true) } }
    urls.forEach(url => { const img = new Image(); img.onload = img.onerror = done; img.src = url })
    return () => clearTimeout(timeout)
  }, [logo, agencias, redes, quarentaAnos, nav])

  // Bloqueia scroll do body na home (não quando usado como footer)
  useEffect(() => {
    if (!isHome || footerHome) return
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  // Fechar menu ao scrollar
  useEffect(() => {
    const handleScroll = () => {
      if (isHome) {
        // Home: fecha em qualquer scroll
        if (aberto !== null) { setAberto(null); setHoveredSub(null) }
      } else {
        // Footer: fecha só ao scrollar para cima
        const currentScrollY = window.scrollY
        if (currentScrollY < lastScrollY.current && aberto !== null) {
          setAberto(null); setHoveredSub(null)
        }
        lastScrollY.current = currentScrollY
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [aberto])

  // Resetar menu quando sai da home
  useEffect(() => {
    if (!isHome) return
    if (location.pathname !== '/') { setAberto(null); setHoveredSub(null) }
  }, [location.pathname])

  // Reset roleta sempre que troca de menu
  useEffect(() => { setActiveSubIdx(0) }, [aberto])
  useEffect(() => { activeSubIdxRef.current = activeSubIdx }, [activeSubIdx])
  useEffect(() => { lastRoletaTime.current = 0; lastNavTime.current = 0; boundaryAcc.current = 0 }, [aberto])

  // Wheel scroll — roleta de submenus
  useEffect(() => {
    const ROLETA_MS  = 700
    const NAV_THRESH = 400

    const onWheel = (e) => {
      if (aberto === null) return
      const link = links[aberto]
      const sublinks = link ? getSublinks(link) : []
      e.preventDefault()

      const direcao = Math.sign(e.deltaY)
      if (direcao === 0) return
      const now = Date.now()

      if (sublinks.length > 0) {
        const isRoleta  = sublinks.length >= SUBMENU_VISIBLE
        const maxOffset = isRoleta ? sublinks.length - 1 : 0

        if (direcao > 0) {
          if (isRoleta && activeSubIdxRef.current < maxOffset) {
            boundaryAcc.current = 0
            if (now - lastRoletaTime.current < ROLETA_MS) return
            lastRoletaTime.current = now
            setActiveSubIdx(prev => prev + 1)
            activeSubIdxRef.current += 1
          }
        } else {
          if (isRoleta && activeSubIdxRef.current > 0) {
            boundaryAcc.current = 0
            if (now - lastRoletaTime.current < ROLETA_MS) return
            lastRoletaTime.current = now
            setActiveSubIdx(prev => prev - 1)
            activeSubIdxRef.current -= 1
          }
        }
        setHoveredSub(null)
      } else {
        boundaryAcc.current += Math.abs(e.deltaY)
        if (boundaryAcc.current < NAV_THRESH) return
        boundaryAcc.current = 0
        if (direcao < 0) setAberto(aberto > 0 ? aberto - 1 : null)
        else setAberto(aberto < links.length - 1 ? aberto + 1 : null)
        setHoveredSub(null)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [aberto, links, equipe, clientes])

  // Touch scroll para roleta no mobile
  useEffect(() => {
    if (aberto === null) return
    const STEP_PX = 160
    const SWIPE_THRESHOLD = 8

    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY
      touchAccDelta.current = 0
      touchTotalMoved.current = 0
    }

    const onTouchMove = (e) => {
      if (touchStartY.current === null) return
      const link = links[aberto]
      const sublinks = link ? getSublinks(link) : []
      if (sublinks.length === 0) return

      const delta = touchStartY.current - e.touches[0].clientY
      touchTotalMoved.current += Math.abs(delta)
      touchStartY.current = e.touches[0].clientY

      if (touchTotalMoved.current > SWIPE_THRESHOLD) e.preventDefault()

      touchAccDelta.current += delta

      const isRoleta  = sublinks.length >= SUBMENU_VISIBLE
      const maxOffset = isRoleta ? sublinks.length - 1 : 0
      if (!isRoleta) return

      while (Math.abs(touchAccDelta.current) >= STEP_PX) {
        if (touchAccDelta.current > 0) {
          if (activeSubIdxRef.current < maxOffset) {
            setActiveSubIdx(prev => prev + 1)
            activeSubIdxRef.current += 1
          }
          touchAccDelta.current -= STEP_PX
        } else {
          if (activeSubIdxRef.current > 0) {
            setActiveSubIdx(prev => prev - 1)
            activeSubIdxRef.current -= 1
          }
          touchAccDelta.current += STEP_PX
        }
      }
      setHoveredSub(null)
    }

    const onTouchEnd = () => { touchStartY.current = null }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [aberto, links, equipe, clientes])

  const isMobile = () => window.innerWidth <= 768

  const handleLink = (e, i, link) => {
    e.preventDefault()
    e.stopPropagation()
    const sublinks = getSublinks(link)

    if (isMobile()) {
      if (sublinks.length > 0) { setAberto(aberto === i ? null : i); setHoveredSub(null) }
      else if (link.url) goTo(link.url)
      return
    }
    // Desktop home: sem sublinks → navega direto; com sublinks → toggle submenu
    if (sublinks.length === 0) {
      if (link.url) goTo(link.url)
      return
    }
    if (aberto === i) { setAberto(null); setHoveredSub(null) }
    else { setAberto(i); setHoveredSub(null) }
  }

  // Renderização do submenu — compartilhada (já usa classes home__submenu em ambos os contextos)
  const renderSubmenu = () => {
    if (aberto === null) return null
    if (isHome && contatoAberto) return null

    const link = links[aberto]
    const isClientes = link && (link.url?.includes('clientes') || link.label?.toLowerCase().includes('clientes'))
    const sublinks = link ? getSublinks(link) : []
    if (!isClientes && sublinks.length === 0) return null

    const mobile   = window.innerWidth <= 768
    const itemH    = mobile ? ITEM_H_M : ITEM_H_D
    const isRoleta = sublinks.length >= SUBMENU_VISIBLE

    const handleSubClick = (sub) => (e) => {
      e.preventDefault()
      if (sub.url) {
        const [path, hash] = sub.url.split('#')
        goTo(path || '/', () => { if (hash) window.location.hash = hash })
      }
    }

    const vw = window.innerWidth
    const vh = window.innerHeight
    const N           = links.length
    const navFontSize = Math.min(Math.min(Math.max(52, 0.158 * vw), 216), (0.68 * vh) / (N * 0.75))
    const navItemH    = navFontSize * 0.75
    const itemCenterY = vh * 0.47 + (aberto - (N - 1) / 2) * navItemH
    const itemBottomY = itemCenterY + navItemH / 2

    // Grid de logos para Clientes
    if (isClientes && clientes?.length) {
      const gridTop = Math.max(itemBottomY + 20, vh * 0.18)
      return (
        <div className="home__submenu" onClick={e => e.stopPropagation()}>
          <div className="home__submenu-logos" style={{ top: gridTop }}>
            {clientes.map((c, j) => (
              <a
                key={j}
                href={`/${c.slug}`}
                className="home__submenu-logo-item"
                onClick={handleSubClick({ url: `/${c.slug}` })}
              >
                {c.logo
                  ? <img src={mediaUrl(c.logo)} alt={c.nome} />
                  : <span className="home__submenu-logo-fallback">{c.nome}</span>
                }
              </a>
            ))}
          </div>
        </div>
      )
    }

    if (isRoleta) {
      const offset     = Math.max(0, Math.min(activeSubIdx, sublinks.length - 1))
      const winPad     = mobile ? 28 : WIN_PAD
      const windowH    = SUBMENU_VISIBLE * itemH + winPad * 2
      const windowTop  = itemBottomY + 30
      const listOffset = winPad - offset * itemH

      return (
        <div className="home__submenu" onClick={e => e.stopPropagation()}>
          <div className="home__submenu-window" style={{ height: windowH, top: windowTop, transform: 'none' }}>
            <div className="home__submenu-list" style={{ transform: `translateY(${listOffset}px)` }}>
              {sublinks.map((sub, j) => {
                const isAtivo = hoveredSub ? hoveredSub === sub : j === offset
                return (
                  <a
                    key={j}
                    href={sub.url || '#'}
                    className={`home__submenu-link${isAtivo ? ' home__submenu-link--ativo' : ''}`}
                    style={{ height: itemH, lineHeight: `${itemH}px` }}
                    onMouseEnter={() => setHoveredSub(sub)}
                    onMouseLeave={() => setHoveredSub(null)}
                    onClick={handleSubClick(sub)}
                  >
                    {sub.label}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="home__submenu" onClick={e => e.stopPropagation()}>
        <div className="home__submenu-center">
          {sublinks.map((sub, j) => {
            const isAtivo = hoveredSub ? hoveredSub === sub : j === 0
            return (
              <a
                key={j}
                href={sub.url || '#'}
                className={`home__submenu-link${isAtivo ? ' home__submenu-link--ativo' : ''}`}
                onMouseEnter={() => setHoveredSub(sub)}
                onMouseLeave={() => setHoveredSub(null)}
                onClick={handleSubClick(sub)}
              >
                {sub.label}
              </a>
            )
          })}
        </div>
      </div>
    )
  }


  // ── HOME ──────────────────────────────────────────────────────────────────
  if (isHome) {
    return (
      <>
        {/* Loading screen — omitido quando usado como footer */}
        {!footerHome && (
          <div className={`home-loading${pronto ? ' home-loading--saiu' : ''}`}>
            <div className="home-loading__spinner" />
          </div>
        )}

        <div
          className={`home${pronto ? ' home--pronto' : ''}`}
          onClick={aberto !== null ? () => { setAberto(null); setHoveredSub(null) } : undefined}
        >

          {/* Menu mobile overlay */}
          <div className={`home__menu-mobile ${menuMobile ? 'home__menu-mobile--aberto' : ''}`} onClick={() => setMenuMobile(false)}>
            <div className="home__menu-mobile__inner" onClick={e => e.stopPropagation()}>
              <div className="home__menu-mobile__header">
                <div className="home__menu-mobile__logo">
                  {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
                </div>
                <button className="home__menu-mobile__fechar" onClick={() => setMenuMobile(false)}>✕</button>
              </div>
              <nav className="home__menu-mobile__nav">
                {links.map((link, i) => {
                  const sublinks = getSublinks(link)
                  return (
                    <button
                      key={i}
                      className="home__menu-mobile__nav-link"
                      onClick={(e) => {
                        e.preventDefault()
                        if (sublinks.length === 0 && link.url) {
                          goTo(link.url)
                          setMenuMobile(false)
                        }
                      }}
                    >
                      {link.label}
                    </button>
                  )
                })}
                <button
                  className="home__menu-mobile__nav-link"
                  onClick={(e) => { e.preventDefault(); goTo('/contato'); setMenuMobile(false) }}
                >
                  Contato
                </button>
              </nav>
              <div className="home__menu-mobile__marcas">
                {agencias?.filter(a => a.logo).map((a, i) => (
                  <a key={i} href={externalUrl(a.url_externo)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(a.logo)} alt={a.nome} />
                  </a>
                ))}
              </div>
              <div className="home__menu-mobile__redes">
                {redes?.redes?.map((rede, i) => (
                  <a key={i} href={externalUrl(rede.url)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(rede.icone)} alt="" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Topo */}
          <header className="home__top">
            <div
              className="home__logo"
              onClick={e => { e.stopPropagation(); if (contatoAberto) goTo('/') }}
              style={contatoAberto ? { cursor: 'pointer' } : undefined}
            >
              {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
            </div>
            {/* câmera — visível no desktop dentro do header */}
            <button
              className="home__camera home__camera--desktop"
              onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }}
              aria-label="40 Anos TV1"
            >
              {quarentaAnos?.ativo && (
                <video muted playsInline preload="metadata" onLoadedMetadata={e => { e.target.currentTime = 3 }}>
                  <source src="/camera-rotation-alpha.webm" type="video/webm" />
                  <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
                </video>
              )}
            </button>
            {/* hamburguer — visível só no mobile */}
            <button className="home__hamburger" onClick={(e) => { e.stopPropagation(); setMenuMobile(true) }} aria-label="Menu">
              <span /><span /><span />
            </button>
          </header>

          {/* câmera mobile — centralizada abaixo do header */}
          <button
            className="home__camera home__camera--mobile"
            onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }}
            aria-label="40 Anos TV1"
          >
            {quarentaAnos?.ativo && (
              <video muted playsInline preload="metadata" onLoadedMetadata={e => { e.target.currentTime = 3 }}>
                <source src="/camera-rotation-alpha.webm" type="video/webm" />
                <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
              </video>
            )}
          </button>

          {/* Nav central */}
          <nav className={`home__nav ${aberto !== null ? 'home__nav--aberto' : ''} ${contatoAberto ? 'home__nav--contato' : ''}`} style={{ '--nav-count': links.length }}>
            {contatoAberto && (
              <div className="home__nav-contato">
                <a href="#" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>SEJA CLIENTE</a>
                <a href="/contato/trabalhe-conosco" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo('/contato/trabalhe-conosco') }}>TRABALHE CONOSCO</a>
                <a href="/contato/outros-assuntos" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo('/contato/outros-assuntos') }}>OUTROS ASSUNTOS</a>
              </div>
            )}
            {!contatoAberto && links.map((link, i) => {
              const esteAberto = aberto === i
              const acima  = aberto !== null && !esteAberto && i < aberto
              const abaixo = aberto !== null && !esteAberto && i > aberto
              return (
                <div
                  key={i}
                  className={['home__nav-item', esteAberto ? 'home__nav-item--ativo' : '', acima ? 'home__nav-item--acima' : '', abaixo ? 'home__nav-item--abaixo' : ''].join(' ')}
                  onClick={e => e.stopPropagation()}
                >
                  <a
                    href={link.url || '#'}
                    className={`home__nav-link ${(acima || abaixo) ? 'home__nav-link--dimmed' : ''}`}
                    onClick={e => handleLink(e, i, link)}
                    dangerouslySetInnerHTML={{ __html: link.label.replace(/\|/g, '<span class="home__nav-sep">|</span>') }}
                  />
                </div>
              )
            })}
          </nav>

          {/* Submenu */}
          {renderSubmenu()}

          {/* Rodapé */}
          <footer className="home__bottom" onClick={e => e.stopPropagation()}>
            <button
              className={`home__contato${contatoAberto ? ' home__contato--inativo' : ''}`}
              onClick={(e) => { e.stopPropagation(); if (!contatoAberto) goTo('/contato') }}
            >Contato</button>
            <AgenciaLogos agencias={agencias} className={`home__marcas ${aberto !== null ? 'home__marcas--oculto' : ''}`} />
            <div className="home__redes">
              {redes?.redes?.map((rede, i) => (
                <a key={i} href={externalUrl(rede.url)} target="_blank" rel="noreferrer">
                  <img src={mediaUrl(rede.icone)} alt="" />
                </a>
              ))}
            </div>
          </footer>
        </div>
      </>
    )
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  return (
    <section
      className={`footer-branco${escuro ? ' footer-branco--escuro' : ''}`}
      onClick={aberto !== null ? () => { setAberto(null); setHoveredSub(null) } : undefined}
    >

      {/* Topo */}
      <div className="footer-branco__top">
        <div className="footer-branco__logo" onClick={e => e.stopPropagation()}>
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        <button
          className="footer-branco__camera"
          onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }}
          aria-label="40 Anos TV1"
        >
          {quarentaAnos?.ativo && (
            <video muted playsInline preload="metadata" onLoadedMetadata={e => { e.target.currentTime = 3 }}>
              <source src="/camera-rotation-alpha.webm" type="video/webm" />
              <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
            </video>
          )}
        </button>
      </div>

      {/* Nav central */}
      <nav className="footer-branco__nav" style={{ '--nav-count': links.length }}>
        {links.map((link, i) => {
          const esteAberto = aberto === i
          const acima  = aberto !== null && !esteAberto && i < aberto
          const abaixo = aberto !== null && !esteAberto && i > aberto
          return (
            <div
              key={i}
              className={['footer-branco__nav-item', esteAberto ? 'footer-branco__nav-item--ativo' : '', acima ? 'footer-branco__nav-item--acima' : '', abaixo ? 'footer-branco__nav-item--abaixo' : ''].join(' ')}
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

      {/* Submenu */}
      {renderSubmenu()}

      {/* Barra inferior */}
      <div className="footer-branco__bottom" onClick={e => e.stopPropagation()}>
        <button
          className="footer-branco__contato"
          onClick={(e) => { e.stopPropagation(); goTo('/contato') }}
        >Contato</button>
        {!semMarcas && <AgenciaLogos agencias={agencias} className={`footer-branco__marcas ${aberto !== null ? 'footer-branco__marcas--oculto' : ''}`} />}
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
