import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import CasesTimeline from '../components/CasesTimeline.jsx'
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
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

function isYoutube(url) {
  return url?.includes('youtube.com') || url?.includes('youtu.be')
}

function youtubeId(url) {
  return url?.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/)?.[1] ?? null
}

function youtubeEmbed(url) {
  const id = youtubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

function youtubeCapa(url) {
  const id = youtubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
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

    const videoId = youtubeId(block.url)
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
    <div className="block-video" id={block.ancora_id || undefined} onClick={() => !aberto && setAberto(true)}>
      <div
        ref={divRef}
        className="block-video__player"
        style={{ display: aberto ? 'block' : 'none' }}
      />
      {!aberto && (
        <>
          <img src={block.capa ? mediaUrl(block.capa) : youtubeCapa(block.url)} alt={block.titulo ?? ''} className="block-video__capa" />
          <div className="block-video__play">
            <svg className="block-video__play-btn" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeWidth="2" />
              <polygon points="26,20 26,44 46,32" fill="#fff" />
            </svg>
          </div>
          {block.titulo && <span className="block-video__titulo">{block.titulo}</span>}
        </>
      )}
    </div>
  )
}

/* ── Subcase ────────────────────────────── */
function Subcase({ block }) {
  const [tocando, setTocando] = useState(false)
  const temVideo = !!block.video_url

  return (
    <section className="block-subcase" id={block.ancora_id || undefined}>
      <div className="block-subcase__content">
        <h2 className="block-subcase__title">{block.titulo}</h2>
        {block.descricao && (
          <div
            className="block-subcase__description"
            dangerouslySetInnerHTML={{ __html: semViuvas(textoParaHtml(block.descricao)) }}
          />
        )}
      </div>
      {block.imagem_capa && (
        <div
          className={`block-subcase__image${temVideo ? ' block-subcase__image--video' : ''}`}
          onClick={temVideo ? () => setTocando(true) : undefined}
        >
          <img src={mediaUrl(block.imagem_capa)} alt={block.titulo} />
          {temVideo && (
            <div className="block-subcase__play">
              <svg className="block-subcase__play-btn" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeWidth="2" />
                <polygon points="26,20 26,44 46,32" fill="#fff" />
              </svg>
            </div>
          )}
        </div>
      )}
      {tocando && (
        <div className="block-subcase__fullscreen" onClick={() => setTocando(false)}>
          <button className="block-subcase__close" onClick={() => setTocando(false)} aria-label="Fechar">✕</button>
          {isYoutube(block.video_url) ? (
            <iframe
              src={`${youtubeEmbed(block.video_url)}?autoplay=1&rel=0&modestbranding=1`}
              title={block.titulo}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <video src={block.video_url} autoPlay controls onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </section>
  )
}

/* ── Galeria ────────────────────────────── */
function Galeria({ itens }) {
  const [ativo, setAtivo] = useState(0)

  // imagens é media múltipla simples — a ordem do array já é a ordem
  // arrumada no media picker do CMS, sem campo "ordem" próprio.
  // Pode vir null (galeria sem imagens no CMS), então normaliza pra array.
  const imagemsOrdenadas = Array.isArray(itens) ? itens : []

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

  // Preload de todas as imagens assim que a galeria monta
  useEffect(() => {
    imagemsOrdenadas.forEach(item => {
      const url = mediaUrl(item)
      if (url) {
        const img = new Image()
        img.src = url
      }
    })
  }, [imagemsOrdenadas])

  if (n === 0) return null

  return (
    <div className="block-galeria">
      <div className="block-galeria__slide">
        <img src={mediaUrl(imagemsOrdenadas[ativo])} alt="" />
        {n > 1 && (
          <>
            {/* Faixas laterais (20%): clique volta/avança uma foto */}
            <button className="block-galeria__zona block-galeria__zona--esq" onClick={anterior} aria-label="Imagem anterior" />
            <button className="block-galeria__zona block-galeria__zona--dir" onClick={proximo} aria-label="Próxima imagem" />
          </>
        )}
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
  if (block.visivel === false) return null

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
      return <Subcase block={block} />

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
      return <Galeria itens={block.imagens} />

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
  const params = useParams()
  const location = useLocation()
  // Se veio por /:slug/:case → clienteSlug + caseSlug normais
  // Se veio por /:slug sem case → é um case histórico sem cliente
  const clienteSlug = params.case ? (params.cliente ?? params.slug) : null
  const caseSlug    = params.case ?? params.slug

  // Origem da navegação: 'cliente' ou 'especialidade'
  const navFrom  = location.state?.from ?? 'cliente'
  const navSlug  = location.state?.slug ?? clienteSlug
  const [data, setData] = useState(null)
  const [logo, setLogo] = useState(null)
  const footerRef = useRef(null)

  const lsKey = `tv1-case-${caseSlug}`
  const [pronto, setPronto] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) ?? '[]').length > 0 } catch { return false }
  })

  // Mount: aquece cache HTTP com URLs salvas anteriormente
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(lsKey) ?? '[]')
      saved.forEach(url => { const img = new Image(); img.src = url })
    } catch {}
  }, [lsKey])

  useEffect(() => {
    axios.get(`${STRAPI}/api/logo-site?populate=logo`).then(r => setLogo(r.data.data)).catch(() => {})
    document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    axios
      .get(
        `${STRAPI}/api/cases` +
        `?filters[slug][$eq]=${caseSlug}` +
        (clienteSlug ? `&filters[cliente][slug][$eq]=${clienteSlug}` : '') +
        `&populate[cliente]=true` +
        `&populate[imagem_capa]=true` +
        `&populate[blocos][populate]=*`
      )
      .then(r => setData(r.data.data?.[0] ?? null))
      .catch(() => {})
  }, [clienteSlug, caseSlug])

  // Quando data carrega: salva URLs no localStorage e aguarda hero carregar
  useEffect(() => {
    if (!data) return
    const urls = [
      mediaUrl(data.imagem_capa),
      ...(data.blocos ?? []).flatMap(b => {
        if (b.__component === 'blocks.imagem-simples') return [mediaUrl(b.imagem)]
        if (b.__component === 'blocks.subcase')       return [mediaUrl(b.imagem_capa)]
        if (b.__component === 'blocks.video')         return [mediaUrl(b.capa)]
        if (b.__component === 'blocks.imagem-trio')   return [mediaUrl(b.imagem_1), mediaUrl(b.imagem_2), mediaUrl(b.imagem_3)]
        if (b.__component === 'blocks.galeria')       return (b.imagens ?? []).map(mediaUrl)
        return []
      }),
    ].filter(Boolean)
    try { localStorage.setItem(lsKey, JSON.stringify(urls)) } catch {}
    if (pronto) return
    if (!urls.length) { setPronto(true); return }
    const timeout = setTimeout(() => setPronto(true), 6000)
    let count = 0
    const done = () => { if (++count >= urls.length) { clearTimeout(timeout); setPronto(true) } }
    urls.forEach(url => { const img = new Image(); img.onload = img.onerror = done; img.src = url })
    return () => clearTimeout(timeout)
  }, [data])

  // Rola até a âncora — precisa esperar "pronto" (não só "data"), porque o
  // conteúdo real (com os ids de âncora) só renderiza depois do spinner;
  // antes disso, document.getElementById nunca encontra nada e o retry
  // desiste sem nunca rolar. Depende de location.hash (não window.location
  // direto) pra também rolar ao trocar de âncora dentro do mesmo case, sem
  // troca de rota — caso em que data/pronto não mudam de novo.
  useEffect(() => {
    if (!data || !pronto) return
    const hash = location.hash.slice(1)
    if (!hash) return
    const tentar = (tentativas = 0) => {
      const el = document.getElementById(hash)
      if (el) {
        // Sem "behavior: smooth" — em alguns navegadores/configurações de
        // acessibilidade (prefers-reduced-motion) o scroll suave falha
        // silenciosamente e a página nunca rola; instantâneo sempre funciona.
        el.scrollIntoView({ block: 'start' })
      } else if (tentativas < 20) {
        setTimeout(() => tentar(tentativas + 1), 150)
      }
    }
    tentar()
  }, [data, pronto, location.hash])

  if (!data || !pronto) return (
    <div className="cliente-loading" style={{ height: '100vh' }}>
      <div className="cliente-loading__spinner" />
    </div>
  )

  return (
    <div className="case-page">

      {/* Hero: título, descrição e imagem capa */}
      <section className="case-hero">
        <div className="case-hero__content">
          {logo?.logo && (
            <button
              className="case-hero__logo"
              onClick={() => footerRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <img src={mediaUrl(logo.logo)} alt="TV1" />
            </button>
          )}
          {data.breadcrumb && (
            <span className="case-hero__breadcrumb">
              {data.cliente?.nome} / {data.breadcrumb}
            </span>
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

      {navSlug && <CasesTimeline tipo={navFrom} slug={navSlug} />}

      <div ref={footerRef}><Menu /></div>

    </div>
  )
}
