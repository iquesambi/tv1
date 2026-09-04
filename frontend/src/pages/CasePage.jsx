import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import Menu, { fetchMenuData } from '../components/Menu.jsx'
import CasesTimeline from '../components/CasesTimeline.jsx'
import { prefetchCases, getEntradasCache } from './CasesPage.jsx'
import './CasePage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'

// Cache em memória + dedupe do detalhe de cada case — sem isso, o
// StrictMode do React (dev) disparava o fetch duas vezes em paralelo, e
// revisitar o mesmo case na mesma sessão refazia a busca do zero mesmo já
// tendo os dados. A busca em si já vem cacheada do servidor (ver
// backend/src/case-detail-cache.ts).
const _caseDetailCache = new Map()
const _caseDetailPromises = new Map()
function fetchCaseDetail(clienteSlug, caseSlug) {
  const key = `${clienteSlug ?? ''}/${caseSlug}`
  if (_caseDetailCache.has(key)) return Promise.resolve(_caseDetailCache.get(key))
  if (_caseDetailPromises.has(key)) return _caseDetailPromises.get(key)
  const query =
    `?slug=${encodeURIComponent(caseSlug)}` +
    (clienteSlug ? `&cliente=${encodeURIComponent(clienteSlug)}` : '')
  const promise = axios
    .get(`${STRAPI}/api/case-detail${query}`)
    .then(r => {
      const resultado = r.data.data
      _caseDetailCache.set(key, resultado)
      _caseDetailPromises.delete(key)
      return resultado
    })
    .catch(err => { _caseDetailPromises.delete(key); throw err })
  _caseDetailPromises.set(key, promise)
  return promise
}

// Quando o CMS não preenche ancora_id, deriva um a partir do título — tem
// que gerar exatamente igual à função de mesmo nome em CasesTimeline.jsx,
// senão o link da timeline (#ancora) não acha esse elemento na página.
function slugifyAncora(texto) {
  if (!texto) return ''
  return String(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

// Imagens do case (capa, blocos) nunca renderizam maiores que o viewport,
// mas várias vêm do CMS em resolução original de milhares de px — pede uma
// versão redimensionada e com formato/qualidade automáticos (webp/avif
// quando suportado) direto na URL do Cloudinary.
const LARGURA_IMG = 1600
const imgUrl = (obj) => {
  const url = mediaUrl(obj)
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${LARGURA_IMG},q_auto,f_auto/`)
}

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
    <div className="block-video" id={block.ancora_id || slugifyAncora(block.titulo) || undefined} onClick={() => !aberto && setAberto(true)}>
      <div
        ref={divRef}
        className="block-video__player"
        style={{ display: aberto ? 'block' : 'none' }}
      />
      {!aberto && (
        <>
          <img src={block.capa ? imgUrl(block.capa) : youtubeCapa(block.url)} alt={block.titulo ?? ''} className="block-video__capa" loading="lazy" />
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
    <section className="block-subcase" id={block.ancora_id || slugifyAncora(block.titulo) || undefined}>
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
          <img src={imgUrl(block.imagem_capa)} alt={block.titulo} loading="lazy" />
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
function Galeria({ itens, mostrarCompleta = false }) {
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

  // Preload de todas as imagens (já redimensionadas) assim que a galeria monta
  useEffect(() => {
    imagemsOrdenadas.forEach(item => {
      const url = imgUrl(item)
      if (url) {
        const img = new Image()
        img.src = url
      }
    })
  }, [imagemsOrdenadas])

  if (n === 0) return null

  return (
    <div className="block-galeria">
      <div className={`block-galeria__slide${mostrarCompleta ? ' block-galeria__slide--completa' : ''}`}>
        <img src={imgUrl(imagemsOrdenadas[ativo])} alt="" />
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
          id={block.ancora_id || slugifyAncora(block.texto) || undefined}
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
          <img src={imgUrl(block.imagem)} alt={block.legenda ?? ''} loading="lazy" />
          {block.legenda && <figcaption>{block.legenda}</figcaption>}
        </figure>
      )

    case 'blocks.galeria':
      return <Galeria itens={block.imagens} mostrarCompleta={block.mostrar_foto_completa} />

    case 'blocks.imagem-trio':
      return (
        <div className="block-trio">
          <div className="block-trio__left">
            <img src={imgUrl(block.imagem_1)} alt="" loading="lazy" />
          </div>
          <div className="block-trio__right">
            <img src={imgUrl(block.imagem_2)} alt="" loading="lazy" />
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
            <img src={imgUrl(block.imagem_3)} alt="" loading="lazy" />
          </div>
        </div>
      )

    case 'blocks.video':
      return <Video block={block} />

    case 'blocks.foto-big-number':
      return (
        <div className="block-foto-big-number">
          <img src={imgUrl(block.imagem)} alt="" loading="lazy" />
          {block.numeros?.length > 0 && (
            <div className="block-foto-big-number__numbers">
              {block.numeros.map((item, i) => (
                <div key={i} className="block-foto-big-number__number-item">
                  <span className="block-foto-big-number__numero">{item.numero}</span>
                  <span className="block-foto-big-number__descricao">{item.descricao}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )

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
// Trocar de um case pro outro mantém o mesmo componente montado (só os
// params da rota mudam), então sem isso o "data" antigo (com a imagem
// antiga) continuava na tela até o novo fetch terminar. O key força um
// remount completo a cada troca de case, reaparecendo o spinner até
// título, descrição e imagem de capa do novo case estarem prontos.
export default function CasePage() {
  const params = useParams()
  const clienteSlug = params.case ? (params.cliente ?? params.slug) : null
  const caseSlug    = params.case ?? params.slug
  return <CasePageInner key={`${clienteSlug ?? ''}/${caseSlug}`} />
}

function CasePageInner() {
  const params = useParams()
  const location = useLocation()
  // Se veio por /:slug/:case → clienteSlug + caseSlug normais
  // Se veio por /:slug sem case → é um case histórico sem cliente
  const clienteSlug = params.case ? (params.cliente ?? params.slug) : null
  const caseSlug    = params.case ?? params.slug

  // Timeline unificada embaixo do case: usamos o mesmo cache da /cases.
  const [entradasTimeline, setEntradasTimeline] = useState(null)
  const [anchorMapTimeline, setAnchorMapTimeline] = useState({})
  const [initialEntryId, setInitialEntryId] = useState(null)
  // Sempre false ao montar: o carrossel só renderiza quando entradas E
  // entry-alvo estão prontos juntos no mesmo render, evitando double-init.
  const [timelinePronta, setTimelinePronta] = useState(false)

  const [data, setData] = useState(null)
  const [is40Anos, setIs40Anos] = useState(false)
  const [logo, setLogo] = useState(null)
  const footerRef = useRef(null)
  const heroTextRef = useRef(null)

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
    // Reaproveita o cache do Menu.jsx em vez de refazer o fetch do logo do site.
    fetchMenuData().then(d => { if (d) setLogo(d.logo) })
    document.body.classList.remove('scroll-locked')
  }, [])

  // Aquece o cache da timeline unificada e determina qual entry
  // centralizar ao montar o carrossel embutido.
  useEffect(() => {
    const href = clienteSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug}`
    // Se o cache já estava pronto ao montar, preenche agora; senão espera o fetch.
    const { entradas: cached, anchorMap: cachedMap } = getEntradasCache()
    if (cached) {
      setEntradasTimeline(cached)
      setAnchorMapTimeline(cachedMap ?? {})
      const entrada = cached.find(e => e.href === href)
      setInitialEntryId(entrada?.id ?? '')   // '' = sem alvo, mas pronta
      setTimelinePronta(true)
      return
    }
    prefetchCases().then(() => {
      const { entradas, anchorMap } = getEntradasCache()
      setEntradasTimeline(entradas)
      setAnchorMapTimeline(anchorMap ?? {})
      const entrada = (entradas ?? []).find(e => e.href === href)
      setInitialEntryId(entrada?.id ?? '')   // '' = sem alvo, mas pronta
      setTimelinePronta(true)
    })
  }, [clienteSlug, caseSlug])

  // Modo preview do Strapi: o link do admin traz documentId/status/token
  // na URL — nesse caso busca direto o rascunho (ou publicado) sem cache,
  // em vez do endpoint público por slug.
  const previewParams = new URLSearchParams(location.search)
  const previewDocumentId = previewParams.get('documentId')
  const previewStatus = previewParams.get('status')
  const previewToken = previewParams.get('token')
  const emPreview = !!previewDocumentId

  useEffect(() => {
    if (emPreview) {
      axios
        .get(`${STRAPI}/api/case-preview`, { params: { documentId: previewDocumentId, status: previewStatus, token: previewToken } })
        .then(r => {
          const resultado = r.data.data
          setData(resultado?.data ?? null)
          setIs40Anos(resultado?.is40Anos ?? false)
        })
        .catch(() => {})
      return
    }
    fetchCaseDetail(clienteSlug, caseSlug)
      .then(resultado => {
        setData(resultado?.data ?? null)
        setIs40Anos(resultado?.is40Anos ?? false)
      })
      .catch(() => {})
  }, [clienteSlug, caseSlug, emPreview, previewDocumentId, previewStatus, previewToken])

  // Avisa o admin do Strapi (iframe pai) que a página carregou — o nome do
  // evento é fixo no protocolo do Strapi (não pode ser outra string).
  useEffect(() => {
    if (!emPreview || window.parent === window) return
    window.parent.postMessage({ type: 'previewReady' }, '*')
  }, [emPreview, data])

  // Quando data carrega: salva URLs (já redimensionadas) no localStorage
  // pra pré-aquecer visitas futuras, e aguarda só a capa do hero — o resto
  // dos blocos (galeria, trio, subcases...) carrega sozinho conforme a
  // página rola (loading="lazy" nos <img>), sem travar a página inteira
  // atrás de um spinner esperando cada imagem do case terminar.
  useEffect(() => {
    if (!data) return
    const urls = [
      imgUrl(data.imagem_capa),
      ...(data.blocos ?? []).flatMap(b => {
        if (b.__component === 'blocks.imagem-simples') return [imgUrl(b.imagem)]
        if (b.__component === 'blocks.subcase')       return [imgUrl(b.imagem_capa)]
        if (b.__component === 'blocks.video')         return [imgUrl(b.capa)]
        if (b.__component === 'blocks.imagem-trio')   return [imgUrl(b.imagem_1), imgUrl(b.imagem_2), imgUrl(b.imagem_3)]
        if (b.__component === 'blocks.foto-big-number') return [imgUrl(b.imagem)]
        if (b.__component === 'blocks.galeria')       return (b.imagens ?? []).map(imgUrl)
        return []
      }),
    ].filter(Boolean)
    try { localStorage.setItem(lsKey, JSON.stringify(urls)) } catch {}
    if (pronto) return
    const heroUrl = imgUrl(data.imagem_capa)
    if (!heroUrl) { setPronto(true); return }
    const timeout = setTimeout(() => setPronto(true), 3000)
    const img = new Image()
    img.onload = img.onerror = () => { clearTimeout(timeout); setPronto(true) }
    img.src = heroUrl
    return () => clearTimeout(timeout)
  }, [data])

  // Encolhe a fonte do bloco de texto do hero (breadcrumb+título+descrição)
  // até caber no espaço abaixo do logo — nunca deixa cortar nem sumir texto.
  // clamp() por vh sozinho não dava conta porque não sabe quanto texto tem
  // cada case; aqui mede de verdade e ajusta.
  useEffect(() => {
    if (!pronto) return
    const el = heroTextRef.current
    if (!el) return

    const ajustar = () => {
      el.style.setProperty('--hero-scale', '1')
      let escala = 1

      // Altura: se não couber mesmo encolhida, .case-hero__text rola (não
      // corta) — por isso aqui tem um piso de 0.5, a fonte nunca fica
      // ilegível só por causa da altura.
      const alturaDisponivel = el.clientHeight
      const alturaNecessaria = el.scrollHeight
      if (alturaDisponivel > 0 && alturaNecessaria > alturaDisponivel) {
        escala = Math.min(escala, Math.max(0.5, (alturaDisponivel / alturaNecessaria) * 0.97))
      }

      // Largura: uma palavra sozinha (ex: "INAUGURAÇÃO") nunca quebra
      // (hyphens/word-break desligados de propósito) e o container corta
      // horizontalmente (overflow-x: hidden) — sem fallback de scroll aqui,
      // então precisa encolher o quanto for necessário pra caber, sem piso.
      const larguraDisponivel = el.clientWidth
      const larguraNecessaria = el.scrollWidth
      if (larguraDisponivel > 0 && larguraNecessaria > larguraDisponivel) {
        escala = Math.min(escala, (larguraDisponivel / larguraNecessaria) * 0.97)
      }

      if (escala < 1) el.style.setProperty('--hero-scale', String(escala))
    }

    ajustar()
    const ro = new ResizeObserver(ajustar)
    ro.observe(el)
    // Reforço: em alguns casos o ResizeObserver não dispara pra mudanças
    // de viewport (só de elemento); resize da janela cobre esse caso.
    window.addEventListener('resize', ajustar)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', ajustar)
    }
  }, [pronto, data])

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

      {emPreview && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 10000,
          background: previewStatus === 'draft' ? '#e6a400' : '#2d7d46',
          color: '#000', fontWeight: 700, fontSize: 13,
          textAlign: 'center', padding: '6px 12px',
        }}>
          MODO PREVIEW — {previewStatus === 'draft' ? 'rascunho (não publicado)' : 'versão publicada'}
        </div>
      )}

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
          {/* Grupo à parte: centraliza só nesse espaço (abaixo do logo, que
              fica sempre no fluxo normal) — título comprido nunca "vaza"
              por cima do logo, mesmo com a janela estreita/baixa. */}
          <div className="case-hero__text" ref={heroTextRef}>
            {data.cliente?.nome && (
              <span className="case-hero__breadcrumb">
                {data.cliente.nome} /
              </span>
            )}
            <h1 className="case-hero__title">{data.titulo}</h1>
            {data.descricao && (
              <div className="case-hero__description" dangerouslySetInnerHTML={{ __html: semViuvas(textoParaHtml(data.descricao)) }} />
            )}
          </div>
        </div>
        {data.imagem_capa && (
          <div className="case-hero__image">
            <img src={imgUrl(data.imagem_capa)} alt={data.titulo} />
          </div>
        )}
      </section>

      {/* Blocos dinâmicos */}
      {data.blocos?.map((block, i) => (
        <Block key={i} block={block} />
      ))}

      {/* Case histórico (40 anos): mostra a timeline de 40 anos, em vez da
          timeline unificada por especialidade. Sempre começa alinhada em
          1997 (o mais antigo) — sem centralizar no case ativo, que num
          carrossel infinito faria cases mais novos aparecerem "antes" dele. */}
      {is40Anos && (
        <div className="case-embedded-timeline">
          <CasesTimeline
            conteudo="quarentaAnos"
            contexto="case"
            tema="escuro"
          />
        </div>
      )}

      {/* Timeline unificada completa — card deste case no centro.
          Só monta quando prefetch + entry alvo estão prontos juntos,
          para evitar a re-inicialização do carrossel que causava scroll bizarro. */}
      {!is40Anos && timelinePronta && entradasTimeline && (
        <div className="case-embedded-timeline">
          <CasesTimeline
            conteudo="unified"
            contexto="case"
            tema="claro"
            entradasPre={entradasTimeline}
            anchorMap={anchorMapTimeline}
            initialEntryId={initialEntryId}
          />
        </div>
      )}

      <div ref={footerRef}><Menu /></div>

    </div>
  )
}
