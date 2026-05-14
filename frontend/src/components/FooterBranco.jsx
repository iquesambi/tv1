import { useEffect, useRef, useState } from 'react'
import { useGoTo, useStartCamera } from '../transition.jsx'
import axios from 'axios'
import './FooterBranco.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null
const externalUrl = (url) => {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const SUBMENU_VISIBLE = 7
const ITEM_H_D = 70
const ITEM_H_M = 46
const WIN_PAD   = 48

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
  const startCamera = useStartCamera()
  const lastScrollY       = useRef(0)
  const activeSubIdxRef   = useRef(0)
  const boundaryAcc       = useRef(0)
  const lastRoletaTime    = useRef(0)
  const touchStartY       = useRef(null)
  const touchAccDelta     = useRef(0)
  const touchTotalMoved   = useRef(0)

  const links = nav?.links ?? []

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

  useEffect(() => {
    api('navigation?populate[links][populate][imagem_hover]=true&populate[links][populate][sublinks][populate][imagem_hover]=true').then(setNav)
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

  useEffect(() => { setActiveSubIdx(0) }, [aberto])
  useEffect(() => { activeSubIdxRef.current = activeSubIdx }, [activeSubIdx])
  useEffect(() => { lastRoletaTime.current = 0; boundaryAcc.current = 0 }, [aberto])

  // Wheel scroll — idêntico à home
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
          // na borda inferior: não fecha, só para
        } else {
          if (isRoleta && activeSubIdxRef.current > 0) {
            boundaryAcc.current = 0
            if (now - lastRoletaTime.current < ROLETA_MS) return
            lastRoletaTime.current = now
            setActiveSubIdx(prev => prev - 1)
            activeSubIdxRef.current -= 1
          }
          // na borda superior: não fecha, só para
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

  // Touch scroll — idêntico à home
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

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [aberto, links, equipe, clientes])

  const handleLink = (e, i) => {
    e.preventDefault()
    if (aberto === i) { setAberto(null); setHoveredSub(null) }
    else { setAberto(i); setHoveredSub(null) }
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
        const isPessoas = link.label?.toLowerCase() === 'pessoas'

        if (isPessoas) {
          return link.imagem_hover
            ? <div key={`${i}-main`} className="footer-branco__bg footer-branco__bg--ativo">
                <img src={mediaUrl(link.imagem_hover)} alt="" />
              </div>
            : null
        }

        return [
          link.imagem_hover && (
            <div
              key={`${i}-main`}
              className={`footer-branco__bg ${hoveredSub === null && !sublinks[activeSubIdx]?.imagem_hover ? 'footer-branco__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(link.imagem_hover)} alt="" />
            </div>
          ),
          ...sublinks.filter(s => s.imagem_hover).map((sub, j) => (
            <div
              key={`${i}-${j}`}
              className={`footer-branco__bg ${hoveredSub === sub || (hoveredSub === null && j === activeSubIdx) ? 'footer-branco__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(sub.imagem_hover)} alt="" />
            </div>
          )),
        ]
      })}

      {/* Topo */}
      <div className="footer-branco__top">
        <div className="footer-branco__logo" onClick={e => e.stopPropagation()}>
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        <button className="footer-branco__camera" onClick={(e) => { e.stopPropagation(); if (qa?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }} aria-label="40 Anos TV1">
          {qa?.ativo && (
            <video muted playsInline preload="metadata" onLoadedMetadata={e => { e.target.currentTime = 3 }}>
              <source src="/camera-rotation-alpha.webm" type="video/webm" />
              <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
            </video>
          )}
        </button>
      </div>

      {/* Nav central */}
      <nav className="footer-branco__nav">
        {links.map((link, i) => {
          const esteAberto = aberto === i
          const acima      = aberto !== null && !esteAberto && i < aberto
          const abaixo     = aberto !== null && !esteAberto && i > aberto

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
                onClick={e => handleLink(e, i)}
              >
                {link.label}
              </a>
            </div>
          )
        })}
      </nav>

      {/* Submenu — fora do nav (transform quebraria position: fixed) */}
      {aberto !== null && (() => {
        const link = links[aberto]
        const sublinks = link ? getSublinks(link) : []
        if (sublinks.length === 0) return null

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

        // Posição do nav item ativo (analítica, igual à home)
        const vw = window.innerWidth
        const vh = window.innerHeight
        const navFontSize = Math.min(Math.max(104, 0.158 * vw), 216)
        const navItemH    = navFontSize * 0.75
        const N           = links.length
        const itemCenterY = vh * 0.5 + (aberto - (N - 1) / 2) * navItemH - vh * 0.35
        const itemBottomY = itemCenterY + navItemH / 2

        // ── 7+ itens: janela clipeada ──
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

        // ── 1–6 itens: bloco abaixo do nav item ──
        const blockTop = Math.max(itemBottomY + 30, vh * 0.26)

        return (
          <div className="home__submenu" onClick={e => e.stopPropagation()}>
            <div className="home__submenu-center" style={{ top: blockTop, transform: 'none', justifyContent: 'flex-start' }}>
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
      })()}

      {/* Barra inferior */}
      <div className="footer-branco__bottom" onClick={e => e.stopPropagation()}>
        <button
          className="footer-branco__contato"
          onClick={(e) => { e.stopPropagation(); goTo('/contato') }}
        >
          Contato
        </button>

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
