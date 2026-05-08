import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useGoTo } from './transition.jsx'
import './App.css'

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

function App() {
  const [nav, setNav]           = useState(null)
  const [logo, setLogo]         = useState(null)
  const [agencias, setAgencias] = useState(null) // marcas do rodapé + agência dos cases
  const [quarentaAnos, setQA]   = useState(null)
  const [redes, setRedes]       = useState(null)
  const [equipe, setEquipe]     = useState(null)
  const [aberto, setAberto]     = useState(null)
  const [hoveredSub, setHoveredSub] = useState(null)
  const [activeSubIdx, setActiveSubIdx] = useState(0)
  const [menuMobile, setMenuMobile] = useState(false)
  const location = useLocation()
  const contatoAberto = location.pathname === '/contato'
  const goTo = useGoTo()
  const lastScrollY = useRef(0)

  useEffect(() => {
    api('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=logo&sort=ordem:asc').then(setAgencias)
    api('quarenta-anos?populate=imagem').then(setQA)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
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

  // Sublinks dinâmicos: /pessoas → membros da equipe
  const getSublinks = (link) => {
    if (link.url === '/pessoas') {
      return (equipe ?? []).map(m => ({
        label: m.nome,
        url: `/pessoas#${slugify(m.nome)}`,
        imagem_hover: m.foto ?? null,
      }))
    }
    return link.sublinks ?? []
  }

  // Reset roleta sempre que troca de menu
  useEffect(() => { setActiveSubIdx(0) }, [aberto])

  // Scroll: roleta dentro do submenu (ou navega entre menus se sem sublinks)
  const accDelta = useRef(0)
  const navLock = useRef(false)
  const activeSubIdxRef = useRef(0)

  useEffect(() => { activeSubIdxRef.current = activeSubIdx }, [activeSubIdx])

  useEffect(() => {
    const STEP_PX = 80          // pixels por troca de item dentro da categoria
    const NAV_THRESHOLD = 180   // threshold forte pra pular entre categorias
    const NAV_LOCK_MS   = 600

    const onWheel = (e) => {
      if (aberto === null) return

      const link = links[aberto]
      const sublinks = link ? getSublinks(link) : []

      e.preventDefault()

      if (sublinks.length > 0) {
        // Roleta — acumula delta e move por passos
        accDelta.current += e.deltaY
        while (Math.abs(accDelta.current) >= STEP_PX) {
          if (accDelta.current > 0) {
            // Scroll down
            if (activeSubIdxRef.current < sublinks.length - 1) {
              setActiveSubIdx(prev => prev + 1)
              activeSubIdxRef.current += 1
              accDelta.current -= STEP_PX
            } else {
              // Último item — acumula até NAV_THRESHOLD pra pular
              if (Math.abs(accDelta.current) >= NAV_THRESHOLD) {
                navLock.current = true
                setTimeout(() => { navLock.current = false }, NAV_LOCK_MS)
                setAberto(aberto < links.length - 1 ? aberto + 1 : null)
                setActiveSubIdx(0)
                activeSubIdxRef.current = 0
                accDelta.current = 0
              }
              break
            }
          } else {
            // Scroll up
            if (activeSubIdxRef.current > 0) {
              setActiveSubIdx(prev => prev - 1)
              activeSubIdxRef.current -= 1
              accDelta.current += STEP_PX
            } else {
              // Primeiro item — acumula até NAV_THRESHOLD pra pular
              if (Math.abs(accDelta.current) >= NAV_THRESHOLD) {
                navLock.current = true
                setTimeout(() => { navLock.current = false }, NAV_LOCK_MS)
                setAberto(aberto > 0 ? aberto - 1 : null)
                setActiveSubIdx(0)
                activeSubIdxRef.current = 0
                accDelta.current = 0
              }
              break
            }
          }
        }
        setHoveredSub(null)
      } else {
        // Sem sublinks: navega entre menus (com lock)
        if (navLock.current) return
        if (Math.abs(e.deltaY) < NAV_THRESHOLD) return
        navLock.current = true
        setTimeout(() => { navLock.current = false }, NAV_LOCK_MS)
        if (e.deltaY < 0) {
          setAberto(aberto > 0 ? aberto - 1 : null)
        } else {
          setAberto(aberto < links.length - 1 ? aberto + 1 : null)
        }
        setHoveredSub(null)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [aberto, links, equipe])

  // Reset acumulador quando muda o menu
  useEffect(() => { accDelta.current = 0 }, [aberto])

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
    <div className="home" onClick={aberto !== null ? () => { setAberto(null); setHoveredSub(null) } : undefined}>

      {/* Backgrounds: imagem do link (padrão ao abrir) + imagem por sublink (hover) */}
      {links.map((link, i) => {
        if (aberto !== i) return null
        const sublinks = getSublinks(link)
        return [
          // fundo padrão do link — aparece quando nenhum sublink está em hover
          link.imagem_hover && (
            <div
              key={`${i}-main`}
              className={`home__bg ${hoveredSub === null ? 'home__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(link.imagem_hover)} alt="" />
            </div>
          ),
          // fundo individual de cada sublink
          ...sublinks.filter(s => s.imagem_hover).map((sub, j) => (
            <div
              key={`${i}-${j}`}
              className={`home__bg ${hoveredSub === sub ? 'home__bg--ativo' : ''}`}
            >
              <img src={mediaUrl(sub.imagem_hover)} alt="" />
            </div>
          )),
        ]
      })}

      {/* Menu mobile overlay */}
      <div className={`home__menu-mobile ${menuMobile ? 'home__menu-mobile--aberto' : ''}`} onClick={() => setMenuMobile(false)}>
        <div className="home__menu-mobile__inner" onClick={e => e.stopPropagation()}>
          {/* conteúdo: redes sociais + links — em breve */}
          <button className="home__menu-mobile__fechar" onClick={() => setMenuMobile(false)}>✕</button>
        </div>
      </div>

      {/* Topo */}
      <header className="home__top">
        <div className="home__logo" onClick={e => e.stopPropagation()}>
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        {/* câmera — visível no desktop dentro do header */}
        <button className="home__camera home__camera--desktop" onClick={(e) => { e.stopPropagation(); quarentaAnos?.ativo && goTo('/quarenta-anos') }} aria-label="40 Anos TV1">
          {quarentaAnos?.ativo && quarentaAnos?.imagem && (
            <img src={mediaUrl(quarentaAnos.imagem)} alt="" />
          )}
        </button>
        {/* hamburguer — visível só no mobile */}
        <button className="home__hamburger" onClick={(e) => { e.stopPropagation(); setMenuMobile(true) }} aria-label="Menu">
          <span /><span /><span />
        </button>
      </header>

      {/* câmera mobile — centralizada abaixo do header */}
      <button className="home__camera home__camera--mobile" onClick={(e) => { e.stopPropagation(); quarentaAnos?.ativo && goTo('/quarenta-anos') }} aria-label="40 Anos TV1">
        {quarentaAnos?.ativo && quarentaAnos?.imagem && (
          <img src={mediaUrl(quarentaAnos.imagem)} alt="" />
        )}
      </button>

      {/* Nav central */}
      <nav className={`home__nav ${aberto !== null ? 'home__nav--aberto' : ''} ${contatoAberto ? 'home__nav--contato' : ''}`}>

        {/* Seção de Contato */}
        {contatoAberto && (
          <div className="home__nav-contato">
            <a href="#" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>SEJA CLIENTE</a>
            <a href="#" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>TRABALHE CONOSCO</a>
            <a href="#" className="home__nav-link home__nav-link--contato" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>OUTROS ASSUNTOS</a>
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

        const sizes = sublinks.map((_, j) => {
          if (!isRoleta) return 70
          const d = Math.abs(j - activeSubIdx)
          return d === 0 ? 90 : Math.max(16, 56 - (d - 1) * 12)
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
                    onMouseEnter={() => { setActiveSubIdx(j); setHoveredSub(sub) }}
                    onMouseLeave={() => setHoveredSub(null)}
                    onClick={e => { e.preventDefault(); sub.url && goTo(sub.url) }}
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
        <button className="home__contato" onClick={(e) => { e.stopPropagation(); goTo('/contato') }}>Contato</button>

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
  )
}

export default App
