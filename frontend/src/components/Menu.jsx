import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useGoTo, useStartCamera, useCameraAtiva } from '../transition.jsx'
import { CAMERA_START_TIME } from '../cameraConfig.js'
import '../App.css'
import './Menu.css'

// Câmera: vai 0→END (1s+1frame), segura 1s, volta→0, espera 7s, repete
// No hover: vai até END e segura enquanto mouse estiver sobre a câmera
const PINGPONG_START = 10 / 30       // frame 10 — posição de repouso
const PINGPONG_END   = CAMERA_START_TIME
const PINGPONG_HOLD  = 1000          // ms no pico
const PINGPONG_WAIT  = 7000          // ms após ciclo

function CameraVideo() {
  const videoRef   = useRef(null)
  const dirRef     = useRef(1)
  const waitRef    = useRef(false)
  const hoveredRef = useRef(false)
  const timerRef   = useRef(null)
  const rafRef     = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let prev = null

    const startCycle = () => {
      if (hoveredRef.current) return
      waitRef.current   = false
      dirRef.current    = 1
      video.currentTime = PINGPONG_START
      prev = null
      rafRef.current = requestAnimationFrame(step)
    }

    const holdAtPeak = () => {
      video.currentTime = PINGPONG_END
      waitRef.current   = true
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
    }

    const step = (ts) => {
      if (waitRef.current) return
      if (prev !== null) {
        const delta = (ts - prev) / 1000
        let next = video.currentTime + dirRef.current * delta

        if (next >= PINGPONG_END) {
          holdAtPeak()
          if (!hoveredRef.current) {
            timerRef.current = setTimeout(() => {
              waitRef.current = false
              dirRef.current  = -1
              prev = null
              rafRef.current  = requestAnimationFrame(step)
            }, PINGPONG_HOLD)
          }
          return
        } else if (next <= PINGPONG_START && dirRef.current === -1) {
          video.currentTime = PINGPONG_START
          waitRef.current   = true
          timerRef.current  = setTimeout(startCycle, PINGPONG_WAIT)
          return
        }
        video.currentTime = next
      }
      prev = ts
      rafRef.current = requestAnimationFrame(step)
    }

    const onEnter = () => {
      hoveredRef.current = true
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
      if (video.currentTime < PINGPONG_END) {
        waitRef.current = false
        dirRef.current  = 1
        prev = null
        rafRef.current  = requestAnimationFrame(step)
      } else {
        holdAtPeak()
      }
    }

    const onLeave = () => {
      hoveredRef.current = false
      clearTimeout(timerRef.current)
      waitRef.current = false
      dirRef.current  = -1
      prev = null
      rafRef.current  = requestAnimationFrame(step)
    }

    video.addEventListener('mouseenter', onEnter)
    video.addEventListener('mouseleave', onLeave)

    const primeAndStart = () => {
      const p = video.play()
      if (p && typeof p.then === 'function') {
        p.then(() => { video.pause(); startCycle() }).catch(() => startCycle())
      } else {
        video.pause()
        startCycle()
      }
    }

    if (video.readyState >= 2) {
      primeAndStart()
    } else {
      video.addEventListener('loadeddata', primeAndStart, { once: true })
      video.load()
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
      video.removeEventListener('loadeddata', primeAndStart)
      video.removeEventListener('mouseenter', onEnter)
      video.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <video ref={videoRef} muted playsInline preload="auto">
      {/* .mov primeiro: Safari usa HEVC alpha (formato correto). Chrome/Firefox não
          suportam hvc1 e pulam para o .webm automaticamente. */}
      <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
      <source src="/camera-rotation-alpha.webm" type="video/webm" />
    </video>
  )
}

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

// Normalização óptica de logos:
// - height explícito (não max-height) para SVGs serem corretamente constrangidos
// - logos quadrados/circulares recebem MAIS altura (círculo de 50px ≈ texto de 38px em peso visual)
// - logos horizontais muito largos recebem menos altura para não dominar
// aspect ≤ 1  → 50px   (VW, Bayer, Shell)
// aspect = 2  → 44px   (McDonald's, NU)
// aspect ≥ 3  → 38px, mas capped pelo max-width 130px
const LOGO_MAX_W = 130

function logoImgStyle(logo, escala = 1) {
  const aspect = (logo?.width && logo?.height) ? logo.width / logo.height : 1.8
  const scale  = Math.max(0.3, Math.min(3, escala || 1))   // clamp seguro

  // Portrait (escudos, empilhados — WB, GWM): normaliza por largura-alvo
  if (aspect < 1) {
    const targetW = Math.round(75 * scale)
    const h = Math.min(Math.round(88 * scale), Math.round(targetW / aspect))
    return { height: h, width: targetW }
  }

  // Landscape/quadrados: teto 44px, redução começa cedo (aspect > 1)
  const t = Math.min(Math.max(aspect - 1, 0) / 2.5, 1)
  let h = Math.max(Math.round((44 - t * 10) * scale), aspect > 2.8 ? 26 : 21)
  let w = Math.round(h * aspect)
  if (w > LOGO_MAX_W) { w = LOGO_MAX_W; h = Math.round(w / aspect) }
  return { height: h, width: w }
}
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
        const novaAba = a.abrir_nova_aba !== false
        return (
          <a
            key={i}
            href={externalUrl(a.url_externa)}
            target={novaAba ? '_blank' : undefined}
            rel={novaAba ? 'noreferrer' : undefined}
          >
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

  // viewport: usado pelo cálculo dinâmico das posições dos itens do nav
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined'
      ? { w: 1440, h: 900 }
      : { w: window.innerWidth, h: window.innerHeight }
  )
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // useLocation só funciona se houver Router acima — na home há, no footer também (dentro do Router)
  const location = useLocation()
  const contatoAberto = isHome ? location.pathname.startsWith('/contato') : false

  const goTo        = useGoTo()
  const startCamera = useStartCamera()
  const cameraAtiva = useCameraAtiva()

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
    api('navigation?populate[links][populate][sublinks][populate]=*').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=*&sort=posicao:asc').then(data =>
      setAgencias(Array.isArray(data) ? data.map(a => ({ ...a, logo: a.Logo ?? a.logo, nome: a.Nome ?? a.nome, slug: a.Slug ?? a.slug })) : [])
    )
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('quarenta-anos?populate=imagem').then(r => { if (isHome) setQA(r); else setQA(r) })
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
    api('clientes?sort=nome:asc&populate[logo]=true&populate[cases][fields][0]=id').then(data => {
      setClientes(data)
      // Pré-carrega logos para evitar flash na abertura do submenu
      if (Array.isArray(data)) {
        data.forEach(c => {
          const url = mediaUrl(c.logo)
          if (url) { const img = new Image(); img.src = url }
        })
      }
    })

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
    const isCases = (link.label ?? '').toLowerCase() === 'cases' || link.url === '/cases'
    // Quando abre o submenu de Cases, dispara prefetch da página /cases
    if (isCases) {
      import('../pages/CasesPage.jsx').then(m => m.prefetchCases?.())
    }

    if (isMobile()) {
      if (link.url && link.url !== '#') { goTo(link.url); return }
      if (sublinks.length > 0) { setAberto(aberto === i ? null : i); setHoveredSub(null) }
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
      // Sublinks do "Cases" SEMPRE navegam pra /cases#slug (timeline unificada).
      // O campo `url` do sublink fica como fallback pra outros menus.
      const isCases = (link.label ?? '').toLowerCase() === 'cases' || link.url === '/cases'
      const ancora = sub.especialidade?.slug || sub.ancora || sub.slug
      let target = isCases && ancora ? `/cases#${ancora}` : sub.url
      if (!target) return
      const [path, hash] = target.split('#')
      goTo(path || '/', () => { if (hash) window.location.hash = '#' + hash })
    }

    const vw = window.innerWidth
    const vh = window.innerHeight
    const N           = links.length
    const navFontSize = Math.min(Math.min(Math.max(52, 0.158 * vw), 216), (0.68 * vh) / (N * 0.75))
    const navItemH    = navFontSize * 0.75
    const itemCenterY = vh * 0.47 + (aberto - (N - 1) / 2) * navItemH
    const itemBottomY = itemCenterY + navItemH / 2

    // Grid de logos para Clientes — layout intercalado (7, 6, 7, 6...)
    if (isClientes && clientes?.length) {
      // Divide em linhas alternando 7 e 6 itens
      const logoRows = []
      let idx = 0, rowIdx = 0
      while (idx < clientes.length) {
        const size = rowIdx % 2 === 0 ? 7 : 6
        logoRows.push(clientes.slice(idx, idx + size))
        idx += size
        rowIdx++
      }

      const numRows = logoRows.length
      const estimatedGridH = numRows * 56 + (numRows - 1) * 32 + 80 // itens + gaps + padding
      // Centraliza verticalmente no viewport
      const gridTop = Math.min(
        Math.max((vh - estimatedGridH) / 2, vh * 0.25),
        vh - estimatedGridH - 48
      )
      return (
        <div className="home__submenu" onClick={e => e.stopPropagation()}>
          <div className="home__submenu-logos" style={{ top: gridTop }}>
            {logoRows.map((row, r) => (
              <div key={r} className="home__submenu-logos__row">
                {row.map((c, j) => {
                  const temCase = c.cases?.length > 0
                  return temCase ? (
                    <a
                      key={j}
                      href={`/${c.slug}`}
                      className="home__submenu-logo-item"
                      onClick={handleSubClick({ url: `/${c.slug}` })}
                    >
                      {c.logo
                        ? <img src={mediaUrl(c.logo)} alt={c.nome} style={logoImgStyle(c.logo, c.escala_logo)} />
                        : <span className="home__submenu-logo-fallback">{c.nome}</span>
                      }
                    </a>
                  ) : (
                    <div
                      key={j}
                      className="home__submenu-logo-item home__submenu-logo-item--sem-case"
                    >
                      {c.logo
                        ? <img src={mediaUrl(c.logo)} alt={c.nome} style={logoImgStyle(c.logo, c.escala_logo)} />
                        : <span className="home__submenu-logo-fallback">{c.nome}</span>
                      }
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (isRoleta) {
      const offset     = Math.max(0, Math.min(activeSubIdx, sublinks.length - 1))
      const winPad     = mobile ? 28 : WIN_PAD
      const windowH    = SUBMENU_VISIBLE * itemH + winPad * 2
      // Desconta o translateY(-35vh) do CSS no item ativo
      const actualItemBottomY = itemBottomY - vh * 0.35
      const windowTop = Math.max(actualItemBottomY + 60, vh * 0.27)
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

    // Posiciona o submenu central abaixo do item ativo (não no centro do
    // viewport), pra não encavalar com o ativo em telas mais curtas. Usa a
    // mesma fórmula de activeTop do computeStyle: max(vh*0.13, acimaBlock+10)
    // OBS: dentro de renderSubmenu, `itemH` é o tamanho dos sublinks (70px);
    // o tamanho dos itens do nav é navItemH (declarado acima).
    const acimaCountSub = aberto
    const activeTopSub  = acimaCountSub > 0 ? acimaCountSub * navItemH + 10 : 0
    const submenuTop    = activeTopSub + navItemH + 40 // bloco do ativo + respiro
    return (
      <div className="home__submenu" onClick={e => e.stopPropagation()}>
        <div className="home__submenu-center" style={{ inset: 'auto 0 0 0', top: submenuTop, justifyContent: 'flex-start' }}>
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


  // ── NAV (compartilhado entre home e footer) ───────────────────────────────
  // Posicionamento dinâmico dos itens do nav:
  //
  // Quando nenhum item está aberto, os itens ficam empilhados no centro
  // (fluxo natural do flex). Quando um item é ativado, calculamos a posição
  // alvo de cada item baseado no tamanho real do viewport e na quantidade de
  // itens — não usamos translateY chumbado em vh, então adicionar/remover
  // itens ou mudar o tamanho da tela não quebra nada.
  const N = links.length
  const vh = viewport.h
  const vw = viewport.w
  // Altura de cada item no tamanho cheio (mesma fórmula que o CSS):
  // font-size = min(clamp(52, 15.8vw, 216), 68vh / N / 0.75); height = font * 0.75
  const fontSize = Math.min(
    Math.min(Math.max(52, 0.158 * vw), 216),
    (0.68 * vh) / Math.max(N, 1) / 0.75
  )
  const itemH = fontSize * 0.75
  // Centro y natural do item i (.home__nav está com top 47% + translate -50% -50%)
  const naturalCenter = (i) => vh * 0.47 + (i - (N - 1) / 2) * itemH

  // Quando um menu é aberto:
  // - O acima mais próximo do ativo ancora o topo do elemento em y=0 (top
  //   das letras encostando na borda superior do viewport).
  // - O ativo é empurrado pra baixo o suficiente pra ficar logo abaixo do
  //   bloco de acima — sem overlap.
  // - Os abaixo se empilham a partir de vh*0.78.
  const computeStyle = (i) => {
    if (aberto === null) return undefined
    const acimaCount = aberto
    // Ativo encosta no topo do viewport. Se houver "acima", ele desce só o
    // suficiente pra ficar logo abaixo do bloco de acima.
    const acimaBlock   = acimaCount * itemH
    const activeTop    = acimaCount > 0 ? acimaBlock + 10 : 0
    const activeTarget = activeTop + itemH / 2
    const bottomStart  = vh * 0.78 + itemH / 2
    if (i === aberto) {
      return { transform: `translateY(${activeTarget - naturalCenter(i)}px)` }
    }
    let target
    if (i < aberto) {
      const distance = aberto - i // 1 = mais próximo do ativo, na borda do topo
      target = itemH / 2 - (distance - 1) * itemH
    } else {
      const distance = i - aberto - 1
      target = bottomStart + distance * itemH
    }
    return { transform: `translateY(${target - naturalCenter(i)}px)` }
  }

  const navBlock = (
    <nav className={`home__nav ${aberto !== null ? 'home__nav--aberto' : ''} ${contatoAberto ? 'home__nav--contato' : ''}`} style={{ '--nav-count': N }}>
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
        const itemStyle = computeStyle(i)
        return (
          <div
            key={i}
            className={['home__nav-item', esteAberto ? 'home__nav-item--ativo' : '', acima ? 'home__nav-item--acima' : '', abaixo ? 'home__nav-item--abaixo' : ''].join(' ')}
            style={itemStyle}
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
  )

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
                <button
                  className="home__menu-mobile__nav-link"
                  onClick={(e) => { e.preventDefault(); goTo('/contato'); setMenuMobile(false) }}
                >
                  Seja cliente
                </button>
                <button
                  className="home__menu-mobile__nav-link"
                  onClick={(e) => { e.preventDefault(); goTo('/contato/trabalhe-conosco'); setMenuMobile(false) }}
                >
                  Trabalhe conosco
                </button>
                <button
                  className="home__menu-mobile__nav-link"
                  onClick={(e) => { e.preventDefault(); goTo('/contato/outros-assuntos'); setMenuMobile(false) }}
                >
                  Outros assuntos
                </button>
              </nav>
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
              onClick={e => {
                e.stopPropagation()
                // Logo da home: fecha todos os menus abertos
                setAberto(null)
                setMenuMobile(false)
                if (contatoAberto) goTo('/')
              }}
              style={{ cursor: 'pointer' }}
            >
              {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
            </div>
            {/* câmera — visível no desktop dentro do header */}
            <div className={`home__camera-wrap${cameraAtiva ? ' home__camera-wrap--oculta' : ''}`}>
              <button
                className="home__camera home__camera--desktop"
                onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }}
                aria-label="40 Anos TV1"
              >
                {quarentaAnos?.ativo && (
                  <CameraVideo />
                )}
              </button>
              {quarentaAnos?.ativo && (
                <img src="/camera-label.svg" className="home__camera__label" alt="" />
              )}
            </div>
            {/* hamburguer — visível só no mobile */}
            <button className="home__hamburger" onClick={(e) => { e.stopPropagation(); setMenuMobile(true) }} aria-label="Menu">
              <span /><span /><span />
            </button>
          </header>

          {/* câmera mobile — centralizada abaixo do header */}
          <div className={`home__camera-wrap${(menuMobile || aberto !== null || cameraAtiva) ? ' home__camera-wrap--oculta' : ''}`}>
            <button
              className="home__camera home__camera--mobile"
              onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }}
              aria-label="40 Anos TV1"
            >
              {quarentaAnos?.ativo && (
                <CameraVideo />
              )}
            </button>
            {quarentaAnos?.ativo && (
              <img src="/camera-label.svg" className="home__camera__label" alt="" />
            )}
          </div>

          {/* Nav central */}
          {navBlock}

          {/* Submenu */}
          {renderSubmenu()}

          {/* Logos mobile — visível só no mobile */}
          <div className="home__marcas-mobile" onClick={e => e.stopPropagation()}>
            <div className="home__menu-mobile__marcas">
              {agencias?.filter(a => a.logo).map((a, i) => (
                <a key={i} href={externalUrl(a.url_externa)} target={a.abrir_nova_aba !== false ? '_blank' : undefined} rel={a.abrir_nova_aba !== false ? 'noreferrer' : undefined}>
                  <img src={mediaUrl(a.logo)} alt={a.nome} />
                </a>
              ))}
            </div>
          </div>

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

      {/* Menu mobile overlay */}
      <div className={`home__menu-mobile ${menuMobile ? 'home__menu-mobile--aberto' : ''}`} onClick={() => setMenuMobile(false)}>
        <div className="home__menu-mobile__inner" onClick={e => e.stopPropagation()}>
          <div className="home__menu-mobile__header">
            <div
              className="home__menu-mobile__logo"
              onClick={() => setMenuMobile(false)}
              style={{ cursor: 'pointer' }}
            >
              {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
            </div>
            <button className="home__menu-mobile__fechar" onClick={() => setMenuMobile(false)}>✕</button>
          </div>
          <nav className="home__menu-mobile__nav">
            <button
              className="home__menu-mobile__nav-link"
              onClick={(e) => { e.preventDefault(); goTo('/contato'); setMenuMobile(false) }}
            >
              Seja cliente
            </button>
            <button
              className="home__menu-mobile__nav-link"
              onClick={(e) => { e.preventDefault(); goTo('/contato/trabalhe-conosco'); setMenuMobile(false) }}
            >
              Trabalhe conosco
            </button>
            <button
              className="home__menu-mobile__nav-link"
              onClick={(e) => { e.preventDefault(); goTo('/contato/outros-assuntos'); setMenuMobile(false) }}
            >
              Outros assuntos
            </button>
          </nav>
          <div className="home__menu-mobile__marcas">
            {agencias?.filter(a => a.logo).map((a, i) => (
              <a key={i} href={externalUrl(a.url_externa)} target={a.abrir_nova_aba !== false ? '_blank' : undefined} rel={a.abrir_nova_aba !== false ? 'noreferrer' : undefined}>
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
      <div className="footer-branco__top">
        <div
          className="footer-branco__logo"
          onClick={e => { e.stopPropagation(); goTo('/') }}
          style={{ cursor: 'pointer' }}
        >
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        {/* câmera — só no desktop */}
        <div className="home__camera-wrap">
          <button
            className="footer-branco__camera"
            onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) startCamera(e.currentTarget.getBoundingClientRect()) }}
            aria-label="40 Anos TV1"
          >
            {quarentaAnos?.ativo && (
              <CameraVideo />
            )}
          </button>
          {quarentaAnos?.ativo && (
            <img src="/camera-label.svg" className="home__camera__label" alt="" />
          )}
        </div>
        {/* hamburguer — só no mobile */}
        <button className="footer-branco__hamburger" onClick={(e) => { e.stopPropagation(); setMenuMobile(true) }} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Câmera mobile — centro da tela */}
      {quarentaAnos?.ativo && (
        <div className={`home__camera-wrap${(menuMobile || aberto !== null || cameraAtiva) ? ' home__camera-wrap--oculta' : ''}`}>
          <div className="footer-branco__camera-mobile" onClick={(e) => { e.stopPropagation(); startCamera(e.currentTarget.getBoundingClientRect()) }}>
            <CameraVideo />
          </div>
          <img src="/camera-label.svg" className="home__camera__label" alt="" />
        </div>
      )}

      {/* Nav central */}
      {navBlock}

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
