import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from './transition.jsx'
import './App.css'

const STRAPI = 'http://localhost:1337'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

// gera slug a partir do nome (mesmo do PessoasPage)
const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

function App() {
  const [nav, setNav]         = useState(null)
  const [logo, setLogo]       = useState(null)
  const [marcas, setMarcas]   = useState(null)
  const [quarentaAnos, setQA] = useState(null)
  const [redes, setRedes]     = useState(null)
  const [equipe, setEquipe]   = useState(null) // membros da equipe
  const [aberto, setAberto]   = useState(null) // índice do link aberto
  const [hoveredSub, setHoveredSub] = useState(null) // sublink em hover
  const goTo = useGoTo()

  useEffect(() => {
    api('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('marca-nav?populate[marcas][populate]=logo').then(setMarcas)
    api('quarenta-anos?populate=imagem').then(setQA)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('equipe?populate[membros][populate]=foto').then(setEquipe)
  }, [])

  const links = nav?.links ?? []

  // Para cada link, decide qual lista de sublinks usar:
  // se o link aponta para /pessoas → usa os membros da equipe dinamicamente
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

  // Scroll forte na home: navega entre itens abertos
  const scrollLocked = useRef(false)
  useEffect(() => {
    const THRESHOLD = 80
    const LOCK_MS   = 700

    const onWheel = (e) => {
      if (aberto === null) return
      if (scrollLocked.current) return
      if (Math.abs(e.deltaY) < THRESHOLD) return

      e.preventDefault()
      scrollLocked.current = true
      setTimeout(() => { scrollLocked.current = false }, LOCK_MS)

      if (e.deltaY < 0) {
        setAberto(aberto > 0 ? aberto - 1 : null)
      } else {
        setAberto(aberto < links.length - 1 ? aberto + 1 : null)
      }
      setHoveredSub(null)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [aberto, links.length])

  const handleLink = (e, i, link) => {
    e.preventDefault()
    if (aberto === i) {
      goTo(link.url)
    } else {
      setAberto(i)
    }
  }

  return (
    <div className="home" onClick={aberto !== null ? () => { setAberto(null); setHoveredSub(null) } : undefined}>

      {/* Um div de bg por sublink — cross-fade suave ao trocar */}
      {links.map((link, i) =>
        aberto === i
          ? getSublinks(link).filter(s => s.imagem_hover).map((sub, j) => (
              <div
                key={`${i}-${j}`}
                className={`home__bg ${hoveredSub === sub ? 'home__bg--ativo' : ''}`}
              >
                <img src={mediaUrl(sub.imagem_hover)} alt="" />
              </div>
            ))
          : null
      )}

      {/* Topo: logo + câmera */}
      <header className="home__top" onClick={e => e.stopPropagation()}>
        <div className="home__logo">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        <div className="home__camera">
          {quarentaAnos?.ativo && quarentaAnos?.imagem && (
            <img src={mediaUrl(quarentaAnos.imagem)} alt="" />
          )}
        </div>
      </header>

      {/* Nav central */}
      <nav className={`home__nav ${aberto !== null ? 'home__nav--aberto' : ''}`} onClick={e => e.stopPropagation()}>
        {links.map((link, i) => {
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
            >
              <a
                href={link.url}
                className={`home__nav-link ${(acima || abaixo) ? 'home__nav-link--dimmed' : ''}`}
                onClick={e => handleLink(e, i, link)}
              >
                {link.label}
              </a>

              {/* Submenu */}
              {esteAberto && sublinks.length > 0 && (
                <div className="home__submenu">
                  {sublinks.map((sub, j) => (
                    <a
                      key={j}
                      href={sub.url || '#'}
                      className={`home__submenu-link ${hoveredSub === sub ? 'home__submenu-link--ativo' : ''}`}
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

      {/* Rodapé */}
      <footer className="home__bottom" onClick={e => e.stopPropagation()}>
        <a href="mailto:contato@tv1.com.br" className="home__contato">Contato</a>

        <div className={`home__marcas ${aberto !== null ? 'home__marcas--oculto' : ''}`}>
          {marcas?.marcas?.map((marca, i) => (
            <a key={i} href={marca.url} target="_blank" rel="noreferrer">
              <img src={mediaUrl(marca.logo)} alt="" />
            </a>
          ))}
        </div>

        <div className="home__redes">
          {redes?.redes?.map((rede, i) => (
            <a key={i} href={rede.url} target="_blank" rel="noreferrer">
              <img src={mediaUrl(rede.icone)} alt="" />
            </a>
          ))}
        </div>
      </footer>

    </div>
  )
}

export default App
