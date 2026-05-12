import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import FooterBranco from '../components/FooterBranco.jsx'
import MobileMenu from '../components/MobileMenu.jsx'
import './CasePage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'

const PALAVRAS_CURTAS = [
  'o','a','os','as','um','uma','uns','umas',
  'e','é','ou','mas','nem',
  'de','da','do','das','dos','d\'',
  'em','na','no','nas','nos',
  'ao','à','aos','às',
  'por','pro','pra','pros','pras',
  'que','se','já','só',
  'com','sem','sob','até',
]

function semViuvas(html) {
  if (!html) return html
  const regex = new RegExp(
    `\\b(${PALAVRAS_CURTAS.join('|')})\\s+`,
    'gi'
  )
  return html.replace(regex, (_, palavra) => `${palavra}&nbsp;`)
}

function textoParaHtml(texto) {
  if (!texto) return texto
  return texto
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

function isYoutube(url) {
  return url?.includes('youtube.com') || url?.includes('youtu.be')
}

function youtubeEmbed(url) {
  const id = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
  return id ? `https://www.youtube.com/embed/${id}` : null
}

/* ── Video ──────────────────────────────── */
function carregarYtApi() {
  if (document.getElementById('yt-api')) return
  const tag = document.createElement('script')
  tag.id = 'yt-api'
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

function Video({ block }) {
  const [aberto, setAberto] = useState(false)
  const playerRef = useRef(null)
  const divRef = useRef(null)

  useEffect(() => {
    if (!aberto) return

    const videoId = block.url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    if (!videoId || !divRef.current) return

    const criar = () => {
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              playerRef.current?.destroy()
              playerRef.current = null
              setAberto(false)
            }
          }
        }
      })
    }

    carregarYtApi()

    if (window.YT?.Player) {
      criar()
    } else {
      window.onYouTubeIframeAPIReady = criar
    }

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [aberto, block.url])

  return (
    <div className="block-video" onClick={() => !aberto && setAberto(true)}>
      <div
        ref={divRef}
        className="block-video__player"
        style={{ display: aberto ? 'block' : 'none' }}
      />
      {!aberto && (
        <>
          <img src={mediaUrl(block.capa)} alt={block.legenda ?? ''} className="block-video__capa" />
          <div className="block-video__play">
            <svg className="block-video__play-btn" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeWidth="2" />
              <polygon points="26,20 26,44 46,32" fill="#fff" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Galeria ────────────────────────────── */
function Galeria({ itens = [] }) {
  const [ativo, setAtivo] = useState(0)

  // Ordena por ordem (se definida), depois mantém a ordem original
  const imagemsOrdenadas = [...itens].sort((a, b) => {
    const aOrd = a.ordem ?? Infinity
    const bOrd = b.ordem ?? Infinity
    return aOrd - bOrd
  })

  const n = imagemsOrdenadas.length

  const anterior = useCallback(() =>
    setAtivo(i => (i - 1 + n) % n), [n])

  const proximo = useCallback(() =>
    setAtivo(i => (i + 1) % n), [n])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') anterior()
      if (e.key === 'ArrowRight') proximo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [anterior, proximo])

  if (n === 0) return null

  return (
    <div className="block-galeria">
      <div className="block-galeria__slide">
        <img src={mediaUrl(imagemsOrdenadas[ativo]?.imagem)} alt="" />
        <div className="block-galeria__stepper">
          {imagemsOrdenadas.map((_, i) => (
            <button
              key={i}
              className={`block-galeria__step${i === ativo ? ' block-galeria__step--ativo' : ''}`}
              onClick={() => setAtivo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Renderizador de blocos ─────────────── */
function Block({ block }) {
  switch (block.__component) {

    case 'blocks.subtitulo':
      return (
        <h2
          className="block-subtitulo"
          id={block.ancora_id || undefined}
        >
          {block.texto}
        </h2>
      )

    case 'blocks.subcase':
      return (
        <section className="block-subcase" id={block.ancora_id || undefined}>
          <div className="block-subcase__content">
            {block.subtitulo && (
              <span className="block-subcase__breadcrumb">{block.subtitulo}</span>
            )}
            <h2 className="block-subcase__title">{block.titulo}</h2>
            {block.descricao && (
              <div
                className="block-subcase__description"
                dangerouslySetInnerHTML={{ __html: semViuvas(textoParaHtml(block.descricao)) }}
              />
            )}
          </div>
          {block.imagem && (
            <div className="block-subcase__image">
              <img src={mediaUrl(block.imagem)} alt={block.titulo} />
            </div>
          )}
        </section>
      )

    case 'blocks.texto':
    case 'blocks.descricao':
      return (
        <div
          className="block-texto"
          dangerouslySetInnerHTML={{ __html: semViuvas(block.conteudo) }}
        />
      )

    case 'blocks.imagem-simples':
      return (
        <figure className="block-imagem-simples">
          <img src={mediaUrl(block.imagem)} alt={block.legenda ?? ''} />
          {block.legenda && <figcaption>{block.legenda}</figcaption>}
        </figure>
      )

    case 'blocks.galeria':
      return <Galeria itens={block.itens} />

    case 'blocks.imagem-trio':
      return (
        <div className="block-trio">
          <div className="block-trio__left">
            <img src={mediaUrl(block.imagem_1)} alt="" />
          </div>
          <div className="block-trio__right">
            <img src={mediaUrl(block.imagem_2)} alt="" />
            {block.numeros?.length > 0 && (
              <div className="block-trio__numbers">
                {block.numeros.map((item, i) => (
                  <div key={i} className="block-trio__number-item">
                    <span className="block-trio__numero">{item.numero}</span>
                    <span className="block-trio__descricao">{item.descricao}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="block-trio__center">
            <img src={mediaUrl(block.imagem_3)} alt="" />
          </div>
        </div>
      )

    case 'blocks.video':
      return <Video block={block} />

    case 'blocks.big-numbers':
      return (
        <div className="block-big-numbers">
          {block.itens?.map((item, i) => (
            <div key={i} className="block-big-numbers__item">
              <span className="block-big-numbers__numero">{item.numero}</span>
              <span className="block-big-numbers__descricao">{item.descricao}</span>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}

/* ── Página ─────────────────────────────── */
export default function CasePage() {
  const { cliente: clienteSlug, case: caseSlug } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [logo, setLogo] = useState(null)
  const [quarentaAnos, setQA] = useState(null)

  useEffect(() => {
    axios.get(`${STRAPI}/api/logo-site?populate=logo`).then(r => setLogo(r.data.data)).catch(() => {})
    axios.get(`${STRAPI}/api/quarenta-anos?populate=imagem`).then(r => setQA(r.data.data)).catch(() => {})
    document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    axios
      .get(
        `${STRAPI}/api/cases` +
        `?filters[slug][$eq]=${caseSlug}` +
        `&filters[cliente][slug][$eq]=${clienteSlug}` +
        `&populate[cliente]=true` +
        `&populate[agencia][populate]=logo` +
        `&populate[imagem_capa]=true` +
        `&populate[blocos][on][blocks.galeria][populate][itens][populate]=imagem` +
        `&populate[blocos][on][blocks.video][populate]=capa` +
        `&populate[blocos][on][blocks.imagem-trio][populate]=*` +
        `&populate[blocos][on][blocks.imagem-simples][populate]=imagem` +
        `&populate[blocos][on][blocks.subcase][populate]=imagem`
      )
      .then(r => setData(r.data.data?.[0] ?? null))
      .catch(() => {})
  }, [clienteSlug, caseSlug])

  // rola até a âncora depois que os blocos renderizam
  useEffect(() => {
    if (!data) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const tentar = (tentativas = 0) => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tentativas < 10) {
        setTimeout(() => tentar(tentativas + 1), 150)
      }
    }
    tentar()
  }, [data])

  if (!data) return <div style={{ padding: 40 }}>Carregando...</div>

  return (
    <div className="case-page">

      {/* Hero: título, descrição e imagem capa */}
      <section className="case-hero">
        <div className="case-hero__content">
          <span className="case-hero__breadcrumb">
            cases / {data.cliente?.nome} / {data.titulo}
          </span>
          {data.agencia?.logo && (
            <div className="case-hero__agency">
              <img src={mediaUrl(data.agencia.logo)} alt={data.agencia.nome} />
            </div>
          )}
          <h1 className="case-hero__title">{data.titulo}</h1>
          {data.descricao && (
            <div className="case-hero__description" dangerouslySetInnerHTML={{ __html: semViuvas(textoParaHtml(data.descricao)) }} />
          )}
        </div>
        {data.imagem_capa && (
          <div className="case-hero__image">
            <img src={mediaUrl(data.imagem_capa)} alt={data.titulo} />
          </div>
        )}
      </section>

      {/* Blocos dinâmicos */}
      {data.blocos?.map((block, i) => (
        <Block key={i} block={block} />
      ))}

      <FooterBranco />

      {/* Última dobra mobile: versão branca da home */}
      <section className="case-home-fold">
        <div className="case-home-fold__header">
          <div className="case-home-fold__logo">
            {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
          </div>
          <MobileMenu logoFiltro="brightness(0)" />
        </div>
        <div className="case-home-fold__center">
          {quarentaAnos?.imagem && (
            <button
              className="case-home-fold__camera-btn"
              onClick={() => quarentaAnos?.ativo && navigate('/quarenta-anos')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: quarentaAnos?.ativo ? 'pointer' : 'default' }}
            >
              <img className="case-home-fold__camera" src={mediaUrl(quarentaAnos.imagem)} alt="" />
            </button>
          )}
          <nav className="case-home-fold__nav">
            <a className="case-home-fold__nav-link" href="/clientes">Cases</a>
            <a className="case-home-fold__nav-link" href="/clientes">Clientes</a>
            <a className="case-home-fold__nav-link" href="/pessoas">Pessoas</a>
          </nav>
        </div>
      </section>

    </div>
  )
}
