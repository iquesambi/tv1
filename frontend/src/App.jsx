import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from './transition.jsx'
import './App.css'

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

function App() {
  const [nav, setNav]           = useState(null)
  const [logo, setLogo]         = useState(null)
  const [agencias, setAgencias] = useState(null) // marcas do rodapé + agência dos cases
  const [quarentaAnos, setQA]   = useState(null)
  const [redes, setRedes]       = useState(null)
  const [equipe, setEquipe]     = useState(null)
  const [aberto, setAberto]     = useState(null)
  const [hoveredSub, setHoveredSub] = useState(null)
  const goTo = useGoTo()

  useEffect(() => {
    api('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover').then(setNav)
    api('logo-site?populate=logo').then(setLogo)
    api('agencias?populate=logo&sort=ordem:asc').then(setAgencias)
    api('quarenta-anos?populate=imagem').then(setQA)
    api('redes-sociais?populate[redes][populate]=icone').then(setRedes)
    api('equipe?populate[membros][populate]=foto').then(setEquipe)
  }, [])

  const links = nav?.links ?? []

  // Sublinks dinâmicos: /pessoas → membros da equipe
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

  // Scroll forte: navega entre itens
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
      // só navega se o link tiver URL definida
      if (link.url) goTo(link.url)
      else { setAberto(null); setHoveredSub(null) }
    } else {
      setAberto(i)
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

      {/* Topo */}
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
                href={link.url || '#'}
                className={`home__nav-link ${(acima || abaixo) ? 'home__nav-link--dimmed' : ''}`}
                onClick={e => handleLink(e, i, link)}
              >
                {link.label}
              </a>

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

      {/* Rodapé — marcas agora vêm de agencias */}
      <footer className="home__bottom" onClick={e => e.stopPropagation()}>
        <a href="mailto:contato@tv1.com.br" className="home__contato">Contato</a>

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
