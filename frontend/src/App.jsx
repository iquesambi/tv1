import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useGoTo, useStartCamera } from './transition.jsx'
import './App.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

// Dados pré-carregados em build time pelo scripts/prefetch.js
// Em dev (sem build) ficam null e o fetch normal é usado
const _pf = window.__TV1_DATA__ ?? {}

const externalUrl = (url) => {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

function App() {
  const [nav, setNav]           = useState(_pf.nav ?? null)
  const [logo, setLogo]         = useState(_pf.logo ?? null)
  const [agencias, setAgencias] = useState(_pf.agencias ?? null)
  const [quarentaAnos, setQA]   = useState(_pf.quarentaAnos ?? null)
  const [redes, setRedes]       = useState(_pf.redes ?? null)
  const [equipe, setEquipe]     = useState(null)
  const [clientes, setClientes] = useState(null)
  const [aberto, setAberto]     = useState(null)
  const [hoveredSub, setHoveredSub] = useState(null)
  const [activeSubIdx, setActiveSubIdx] = useState(0)
  const [menuMobile, setMenuMobile] = useState(false)
  const [pronto, setPronto]         = useState(false)
  const location = useLocation()
  const contatoAberto = location.pathname.startsWith('/contato')
  const goTo = useGoTo()
  const startCamera = useStartCamera()
  const lastScrollY = useRef(0)
  const touchStartY = useRef(null)
  const touchAccDelta = useRef(0)

  useEffect(() => {
    api('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=logo&sort=ordem:asc').then(setAgencias)
    api('quarenta-anos?populate=imagem').then(setQA)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
    api('clientes?sort=nome:asc').then(setClientes)

    // Pré-carrega imagens salvas da visita anterior (já estarão no cache HTTP)
    try {
      const saved = JSON.parse(localStorage.getItem('tv1-home-imgs') ?? '[]')
      saved.forEach(url => { const i = new Image(); i.src = url })
    } catch {}
  }, [])

  // Preloader: aguarda logo + câmera + agências + redes + hover images antes de exibir
  useEffect(() => {
    if (!logo || !agencias || !redes || !nav) return

    const urls = [
      mediaUrl(logo?.logo),
      mediaUrl(quarentaAnos?.imagem),
      ...(agencias ?? []).filter(a => a.logo).map(a => mediaUrl(a.logo)),
      ...(redes?.redes ?? []).filter(r => r.icone).map(r => mediaUrl(r.icone)),
      // hover images dos links e sublinks da nav
      ...(nav?.links ?? []).flatMap(link => [
        link.imagem_hover ? mediaUrl(link.imagem_hover) : null,
        ...(link.sublinks ?? []).map(sub => sub.imagem_hover ? mediaUrl(sub.imagem_hover) : null),
      ]),
    ].filter(Boolean)

    // Salva URLs no localStorage para pré-carregar na próxima visita
    try { localStorage.setItem('tv1-home-imgs', JSON.stringify(urls)) } catch {}

    if (urls.length === 0) { setPronto(true); return }

    // Timeout de segurança: mostra mesmo se algum asset demorar demais
    const timeout = setTimeout(() => setPronto(true), 5000)

    let count = 0
    const done = () => { if (++count >= urls.length) { clearTimeout(timeout); setPronto(true) } }
    urls.forEach(url => { const img = new Image(); img.onload = img.onerror = done; img.src = url })

    return () => clearTimeout(timeout)
  }, [logo, agencias, redes, quarentaAnos, nav])

  // Bloqueia scroll do body na home (impede barra do Chrome de se mover)
  useEffect(() => {
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
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

  // Sublinks dinâmicos: /pessoas → navegação com slug; /clientes → clientes
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

  // Reset roleta sempre que troca de menu
  useEffect(() => { setActiveSubIdx(0) }, [aberto])

  // Scroll: roleta dentro do submenu (ou navega entre menus se sem sublinks)
  const lastRoletaTime = useRef(0)
  const lastNavTime = useRef(0)
  const activeSubIdxRef = useRef(0)
  const boundaryAcc = useRef(0)

  useEffect(() => { activeSubIdxRef.current = activeSubIdx }, [activeSubIdx])

  useEffect(() => {
    const ROLETA_MS  = 700   // tempo mínimo entre trocas de item
    const NAV_THRESH = 400   // deltaY acumulado necessário para sair da borda

    const onWheel = (e) => {
      if (aberto === null) return

      const link = links[aberto]
      const sublinks = link ? getSublinks(link) : []

      e.preventDefault()

      const direcao = Math.sign(e.deltaY)
      if (direcao === 0) return
      const now = Date.now()

      if (sublinks.length > 0) {
        if (direcao > 0) {
          if (activeSubIdxRef.current < sublinks.length - 1) {
            // no meio da lista: throttle normal
            boundaryAcc.current = 0
            if (now - lastRoletaTime.current < ROLETA_MS) return
            lastRoletaTime.current = now
            setActiveSubIdx(prev => prev + 1)
            activeSubIdxRef.current += 1
          } else {
            // no último item: precisa acumular scroll forte pra sair
            boundaryAcc.current += Math.abs(e.deltaY)
            if (boundaryAcc.current < NAV_THRESH) return
            boundaryAcc.current = 0
            lastNavTime.current = now
            setAberto(aberto < links.length - 1 ? aberto + 1 : null)
            setActiveSubIdx(0)
            activeSubIdxRef.current = 0
          }
        } else {
          if (activeSubIdxRef.current > 0) {
            // no meio da lista: throttle normal
            boundaryAcc.current = 0
            if (now - lastRoletaTime.current < ROLETA_MS) return
            lastRoletaTime.current = now
            setActiveSubIdx(prev => prev - 1)
            activeSubIdxRef.current -= 1
          } else {
            // no primeiro item: precisa acumular scroll forte pra sair
            boundaryAcc.current += Math.abs(e.deltaY)
            if (boundaryAcc.current < NAV_THRESH) return
            boundaryAcc.current = 0
            setAberto(aberto > 0 ? aberto - 1 : null)
            setActiveSubIdx(0)
            activeSubIdxRef.current = 0
          }
        }
        setHoveredSub(null)
      } else {
        boundaryAcc.current += Math.abs(e.deltaY)
        if (boundaryAcc.current < NAV_THRESH) return
        boundaryAcc.current = 0
        if (direcao < 0) {
          setAberto(aberto > 0 ? aberto - 1 : null)
        } else {
          setAberto(aberto < links.length - 1 ? aberto + 1 : null)
        }
        setHoveredSub(null)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [aberto, links, equipe, clientes])

  // Reset acumuladores quando muda o menu
  useEffect(() => { lastRoletaTime.current = 0; lastNavTime.current = 0; boundaryAcc.current = 0 }, [aberto])

  // Touch scroll para roleta no mobile
  const touchTotalMoved = useRef(0)

  useEffect(() => {
    if (aberto === null) return

    const STEP_PX = 160
    const SWIPE_THRESHOLD = 8 // px mínimos pra considerar swipe (não tap)

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

      // Só bloqueia o scroll nativo se for claramente um swipe, não um tap
      if (touchTotalMoved.current > SWIPE_THRESHOLD) {
        e.preventDefault()
      }

      touchAccDelta.current += delta

      while (Math.abs(touchAccDelta.current) >= STEP_PX) {
        if (touchAccDelta.current > 0) {
          if (activeSubIdxRef.current < sublinks.length - 1) {
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
    // Desktop: toggle submenu — nunca navega direto pelo clique no menu principal
    if (aberto === i) {
      setAberto(null); setHoveredSub(null)
    } else {
      setAberto(i); setHoveredSub(null)
    }
  }

  return (
    <>
      {/* Loading screen */}
      <div className={`home-loading${pronto ? ' home-loading--saiu' : ''}`}>
        <div className="home-loading__spinner" />
      </div>

    <div className={`home${pronto ? ' home--pronto' : ''}${aberto !== null ? ' home--menu-aberto' : ''}`} onClick={aberto !== null ? () => { setAberto(null); setHoveredSub(null) } : undefined}>

      {/* Backgrounds: imagem do link (padrão ao abrir) + imagem por sublink (hover) */}
      {links.map((link, i) => {
        if (aberto !== i) return null
        const sublinks = getSublinks(link)
        return [
          // fundo padrão do link — aparece quando nenhum sublink hovered e o ativo não tem imagem
          link.imagem_hover && (
            <div
              key={`${i}-main`}
              className={`home__bg ${hoveredSub === null && !sublinks[activeSubIdx]?.imagem_hover ? 'home__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(link.imagem_hover)} alt="" />
            </div>
          ),
          // fundo individual de cada sublink — ativo por hover OU por ser o item ativo da roleta
          ...sublinks.filter(s => s.imagem_hover).map((sub, j) => (
            <div
              key={`${i}-${j}`}
              className={`home__bg ${hoveredSub === sub || (hoveredSub === null && j === activeSubIdx) ? 'home__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(sub.imagem_hover)} alt="" />
            </div>
          )),
        ]
      })}

      {/* Menu mobile overlay */}
      <div className={`home__menu-mobile ${menuMobile ? 'home__menu-mobile--aberto' : ''}`} onClick={() => setMenuMobile(false)}>
        <div className="home__menu-mobile__inner" onClick={e => e.stopPropagation()}>
          {/* Header do menu mobile */}
          <div className="home__menu-mobile__header">
            <div className="home__menu-mobile__logo">
              {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
            </div>
            <button className="home__menu-mobile__fechar" onClick={() => setMenuMobile(false)}>✕</button>
          </div>

          {/* Nav mobile */}
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
              onClick={(e) => {
                e.preventDefault()
                goTo('/contato')
                setMenuMobile(false)
              }}
            >
              Contato
            </button>
          </nav>

          {/* Marcas — flutua entre menu e linha */}
          <div className="home__menu-mobile__marcas">
            {agencias?.filter(a => a.logo).map((a, i) => (
              <a key={i} href={externalUrl(a.url_externo)} target="_blank" rel="noreferrer">
                <img src={mediaUrl(a.logo)} alt={a.nome} />
              </a>
            ))}
          </div>

          {/* Redes — fixas no final com linha acima */}
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
        <button className="home__camera home__camera--desktop" onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) { startCamera(e.currentTarget.getBoundingClientRect()) } }} aria-label="40 Anos TV1">
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
      <button className="home__camera home__camera--mobile" onClick={(e) => { e.stopPropagation(); if (quarentaAnos?.ativo) { startCamera(e.currentTarget.getBoundingClientRect()) } }} aria-label="40 Anos TV1">
        {quarentaAnos?.ativo && (
          <video muted playsInline preload="metadata" onLoadedMetadata={e => { e.target.currentTime = 3 }}>
            <source src="/camera-rotation-alpha.webm" type="video/webm" />
            <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
          </video>
        )}
      </button>

      {/* Nav central */}
      <nav className={`home__nav ${aberto !== null ? 'home__nav--aberto' : ''} ${contatoAberto ? 'home__nav--contato' : ''}`}>

        {/* Seção de Contato */}
        {contatoAberto && (
          <div className="home__nav-contato">
            <a href="#" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>SEJA CLIENTE</a>
            <a href="/contato/trabalhe-conosco" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo('/contato/trabalhe-conosco') }}>TRABALHE CONOSCO</a>
            <a href="/contato/outros-assuntos" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo('/contato/outros-assuntos') }}>OUTROS ASSUNTOS</a>
          </div>
        )}

        {/* Links normais da nav */}
        {!contatoAberto && links.map((link, i) => {
          const esteAberto = aberto === i
          const acima   = aberto !== null && !esteAberto && i < aberto
          const abaixo  = aberto !== null && !esteAberto && i > aberto
          const sublinks = getSublinks(link)

          return (
            <div
              key={i}
              className={[
                'home__nav-item',
                esteAberto ? 'home__nav-item--ativo'  : '',
                acima      ? 'home__nav-item--acima'  : '',
                abaixo     ? 'home__nav-item--abaixo' : '',
              ].join(' ')}
              onClick={e => e.stopPropagation()}
            >
              <a
                href={link.url || '#'}
                className={`home__nav-link ${(acima || abaixo) ? 'home__nav-link--dimmed' : ''}`}
                onClick={e => handleLink(e, i, link)}
              >
                {link.label}
              </a>
            </div>
          )
        })}
      </nav>

      {/* Submenu Roleta - fora do nav (porque nav tem transform que quebraria position: fixed) */}
      {aberto !== null && !contatoAberto && (() => {
        const link = links[aberto]
        const sublinks = link ? getSublinks(link) : []
        if (sublinks.length === 0) return null

        const isRoleta = sublinks.length >= 5
        const mobile = window.innerWidth <= 768

        const sizes = sublinks.map((_, j) => {
          if (!isRoleta) return mobile ? 44 : 70
          const d = Math.abs(j - activeSubIdx)
          return d === 0 ? (mobile ? 32 : 90) : Math.max(10, (mobile ? 24 : 56) - (d - 1) * (mobile ? 4 : 12))
        })
        const centers = []
        let acc = 0
        sizes.forEach(h => { centers.push(acc + h / 2); acc += h })
        const totalHeight = acc

        // Para não-roleta: targetY varia por posição do item ativo
        // Primeiro item → 35%, último item → 62%, intermediários → interpolado
        const ratio = links.length > 1 ? aberto / (links.length - 1) : 0.5
        const normalTargetY = window.innerHeight * (0.35 + ratio * 0.27)

        const listShift = isRoleta
          ? window.innerHeight * 0.58 - centers[activeSubIdx]
          : normalTargetY - totalHeight / 2

        return (
          <div className="home__submenu" onClick={e => e.stopPropagation()}>
            <div
              className="home__submenu-list"
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
                    className={`home__submenu-link ${isActive ? 'home__submenu-link--ativo' : ''}`}
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

      {/* Rodapé — marcas agora vêm de agencias */}
      <footer className="home__bottom" onClick={e => e.stopPropagation()}>
        <button
          className={`home__contato${contatoAberto ? ' home__contato--inativo' : ''}`}
          onClick={(e) => { e.stopPropagation(); if (!contatoAberto) goTo('/contato') }}
        >Contato</button>

        <div className={`home__marcas ${aberto !== null ? 'home__marcas--oculto' : ''}`}>
          {agencias?.filter(a => a.logo).map((a, i) => (
            <a key={i} href={externalUrl(a.url_externo)} target="_blank" rel="noreferrer">
              <img src={mediaUrl(a.logo)} alt={a.nome} />
            </a>
          ))}
        </div>

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

export default App
