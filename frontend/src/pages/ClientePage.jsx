import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import MobileMenu from '../components/MobileMenu.jsx'
import './ClientePage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

/* ── monta entradas (principal + âncoras de subtítulo) ── */
function montarEntradas(cases) {
  const entradas = []
  for (const c of cases) {
    const clienteSlug = c.cliente?.slug
    const caseSlug    = c.slug

    entradas.push({
      id:          `${c.id}-main`,
      ano:         c.Data ? new Date(c.Data).getFullYear() : null,
      data:        c.Data ? new Date(c.Data) : new Date(0),
      nome:        c.titulo,
      capa:        c.imagem_capa,
      href:        `/${clienteSlug}/${caseSlug}`,
      agenciaLogo: c.agencia?.logo ?? null,
      agenciaNome: c.agencia?.nome ?? null,
    })

    for (const bloco of c.blocos ?? []) {
      if (
        bloco.__component === 'blocks.subtitulo' &&
        bloco.timeline &&
        bloco.timeline_data
      ) {
        entradas.push({
          id:          `${c.id}-sub-${bloco.id}`,
          ano:         new Date(bloco.timeline_data).getFullYear(),
          data:        new Date(bloco.timeline_data),
          nome:        bloco.timeline_nome || bloco.texto,
          capa:        bloco.timeline_capa || c.imagem_capa,
          href:        `/${clienteSlug}/${caseSlug}#${bloco.ancora_id ?? ''}`,
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
        })
      }
    }
  }
  // Ordena por ano decrescente; sem data vai pro fim
  entradas.sort((a, b) => {
    if (a.ano === null && b.ano === null) return 0
    if (a.ano === null) return 1
    if (b.ano === null) return -1
    if (a.ano !== b.ano) return b.ano - a.ano
    return a.data - b.data
  })
  return entradas
}

/* ── grupos de anos (cards consecutivos do mesmo ano agrupados) ── */
function gruposDeAnos(entradas) {
  if (!entradas.length) return []
  const grupos = []
  for (let i = 0; i < entradas.length; i++) {
    const ano = entradas[i].ano
    const ult = grupos[grupos.length - 1]
    if (ult && ult.ano === ano) {
      ult.indices.push(i)
    } else {
      grupos.push({ ano, indices: [i] })
    }
  }
  return grupos
}

/* ── índice do card "ativo" para layouts estáticos ── */
function ativoIdxParaN(n) {
  if (n <= 1) return 0
  if (n === 2) return 1   // rightmost
  return 1                // center (para n=3, idx 1 = centro)
}

/* ── alturas alternadas para o carrossel ── */
const ALTURAS = [460, 340, 400, 310, 380]
function alturaParaIdx(idx) { return ALTURAS[idx % ALTURAS.length] }

/* ── Card ── */
function CaseCard({ entrada, idx, ativo = false, carousel = false, cardRef, clienteSlug }) {
  const goTo = useGoTo()
  return (
    <div
      ref={cardRef}
      className={[
        'cliente-card',
        ativo     ? 'cliente-card--ativo'    : 'cliente-card--inativo',
        carousel  ? 'cliente-card--carousel' : '',
      ].join(' ')}
      style={carousel ? { height: alturaParaIdx(idx) } : undefined}
      onClick={() => goTo(entrada.href, null, { from: 'cliente', slug: clienteSlug })}
    >
      {entrada.capa && (
        <img src={mediaUrl(entrada.capa)} alt={entrada.nome} className="cliente-card__img" />
      )}

      {/* Logo da agência — canto superior esquerdo no mobile */}
      {entrada.agenciaLogo && (
        <div className="cliente-card__agencia">
          <img src={mediaUrl(entrada.agenciaLogo)} alt={entrada.agenciaNome ?? ''} />
        </div>
      )}

      {/* Overlay com título */}
      <div className="cliente-card__overlay">
        <h3 className="cliente-card__titulo">{entrada.nome}</h3>
      </div>
    </div>
  )
}

/* ── Timeline ── */
function Timeline({ labels, xRef, tiltDeltaRef, timelineTrackRef, usaCarrossel, onLabelClick }) {
  const isDragging = useRef(false)
  const dragStart  = useRef(0)

  const handleMouseDown = (e) => {
    if (!usaCarrossel || !xRef?.current) return
    isDragging.current = true
    dragStart.current = e.clientX
    e.preventDefault()
  }

  useEffect(() => {
    if (!usaCarrossel) return
    const onMove = (e) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStart.current
      dragStart.current = e.clientX
      if (xRef?.current) xRef.current.x += delta
      if (tiltDeltaRef?.current != null) {
        tiltDeltaRef.current = -delta * 4
      }
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [usaCarrossel, xRef, tiltDeltaRef])

  const handleTouchStart = (e) => {
    if (!usaCarrossel || !xRef?.current) return
    isDragging.current = true
    dragStart.current = e.touches[0].clientX
  }
  const handleTouchMove = (e) => {
    if (!isDragging.current || !usaCarrossel) return
    const delta = e.touches[0].clientX - dragStart.current
    dragStart.current = e.touches[0].clientX
    if (xRef?.current) xRef.current.x += delta
    if (tiltDeltaRef?.current != null) tiltDeltaRef.current = -delta * 4
    e.preventDefault()
  }
  const handleTouchEnd = () => { isDragging.current = false }

  // Carrossel: ticks fixos, labels deslizam dentro do viewport, posicionados em %
  if (usaCarrossel) {
    return (
      <div
        className="timeline timeline--carousel"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="timeline__inner">
          {/* Ticks fixos */}
          <div className="timeline__ticks">
            {Array.from({ length: 120 }).map((_, i) => (
              <div key={i} className="timeline__tick" />
            ))}
          </div>
          {/* Labels triplicados deslizando */}
          <div className="timeline__labels-viewport">
            <div className="timeline__labels-track" ref={timelineTrackRef}>
              {[0, 1, 2].map(setIdx => (
                <div className="timeline__labels-set" key={setIdx}>
                  {labels.map((l, i) => (
                    <div
                      key={i}
                      className="timeline__label timeline__label--clicavel"
                      style={{ left: `${l.pos}%` }}
                      onClick={() => onLabelClick?.(l.cardIdx)}
                    >
                      {l.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Estático: timeline simples, sem drag
  return (
    <div className="timeline">
      <div className="timeline__inner">
        <div className="timeline__ticks">
          {Array.from({ length: 120 }).map((_, i) => (
            <div key={i} className="timeline__tick" />
          ))}
        </div>
        <div className="timeline__labels-static">
          {labels.map((l, i) => (
            <div
              key={i}
              className="timeline__label"
              style={{ left: `${l.pos}%` }}
            >
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Página ── */
export default function ClientePage() {
  const params = useParams()
  const clienteSlug = params.cliente ?? params.slug
  const [entradas, setEntradas]  = useState([])
  const [logo, setLogo]          = useState(null)
  const viewportRef = useRef(null)
  const trackRef    = useRef(null)
  const timelineTrackRef = useRef(null)
  // ref compartilhado entre o tick e o drag da timeline
  const xRef = useRef({ x: 0 })
  const xTargetRef      = useRef(null)
  const firstSetCardsRef = useRef([])
  const oneSetRef        = useRef(0)
  // delta usado para calcular o tilt 3D dos cards (alimentado por wheel ou drag)
  const tiltDeltaRef = useRef(0)
  const goTo = useGoTo()

  const handleLabelClick = (cardIdx) => {
    const cards     = firstSetCardsRef.current
    const container = viewportRef.current
    if (!cards[cardIdx] || !container) return
    const cardCenter = cards[cardIdx].offsetLeft + cards[cardIdx].offsetWidth / 2
    const base    = container.clientWidth / 2 - oneSetRef.current - cardCenter
    const oneSet  = oneSetRef.current
    const cur     = xRef.current.x
    const options = [base - oneSet, base, base + oneSet]
    xTargetRef.current = options.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a)
  }

  /* fetch logo do site */
  useEffect(() => {
    axios.get(`${STRAPI}/api/logo-site?populate=logo`)
      .then(r => setLogo(r.data.data?.logo ?? null))
      .catch(() => {})
    // Bloqueia scroll do body (página full screen, sem scroll)
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  /* fetch — inclui logo da agência */
  useEffect(() => {
    axios
      .get(
        `${STRAPI}/api/cases` +
        `?filters[cliente][slug][$eq]=${clienteSlug}` +
        `&populate[cliente]=true` +
        `&populate[agencia][populate]=logo` +
        `&populate[imagem_capa]=true` +
        `&populate[blocos][populate]=*` +
        `&sort=Data:asc`
      )
      .then(r => setEntradas(montarEntradas(r.data.data ?? [])))
      .catch(() => {})
  }, [clienteSlug])

  const n           = entradas.length
  const usaCarrossel = n >= 4
  const ativoIdx    = usaCarrossel ? -1 : ativoIdxParaN(n)

  // labels com posição em % calculada a partir dos cards reais (medidos)
  const [labels, setLabels] = useState([])

  // Preload das capas — pula spinner se já tiver cache local
  const lsKey = `tv1-timeline-${clienteSlug}`
  const [pronto, setPronto] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) ?? '[]').length > 0 } catch { return false }
  })

  // Mount: precarrega do localStorage para aquecer o cache HTTP
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(lsKey) ?? '[]')
      saved.forEach(url => { const img = new Image(); img.src = url })
    } catch {}
  }, [lsKey])

  // Quando entradas carregam: salva URLs + aguarda imagens (1ª visita)
  useEffect(() => {
    if (!n) return
    const urls = entradas.map(e => mediaUrl(e.capa)).filter(Boolean)
    try { localStorage.setItem(lsKey, JSON.stringify(urls)) } catch {}
    if (pronto) return   // já estava em cache, não precisa esperar
    if (!urls.length) { setPronto(true); return }
    const timeout = setTimeout(() => setPronto(true), 6000)
    let count = 0
    const done = () => { if (++count >= urls.length) { clearTimeout(timeout); setPronto(true) } }
    urls.forEach(url => { const img = new Image(); img.onload = img.onerror = done; img.src = url })
    return () => clearTimeout(timeout)
  }, [entradas])

  /* ── Scroll: tilt sempre; movimento X só no carrossel ── */
  useEffect(() => {
    if (!n) return
    const container = viewportRef.current
    // para static: querySelectorAll no próprio container
    // para carousel: no trackRef (filho translateX)
    const track = usaCarrossel ? trackRef.current : viewportRef.current
    if (!container || !track) return

    const oneSet = usaCarrossel ? track.scrollWidth / 3 : 0
    xRef.current.x = usaCarrossel ? -oneSet : 0
    xTargetRef.current = null
    tiltDeltaRef.current = 0
    let tilt  = 0
    let raf

    let cards = Array.from(track.querySelectorAll('.cliente-card'))

    if (usaCarrossel) {
      firstSetCardsRef.current = cards.slice(0, n)
      oneSetRef.current = oneSet
    }

    const mobile = window.innerWidth <= 768

    // Sincroniza largura dos sets de labels com o oneSet do carrossel + calcula posições reais
    if (usaCarrossel && timelineTrackRef.current) {
      const sets = timelineTrackRef.current.querySelectorAll('.timeline__labels-set')
      sets.forEach(s => { s.style.width = `${oneSet}px` })

      const firstSetCards = cards.slice(0, n)

      let novosLabels
      if (mobile) {
        // Mobile: label em cada card individualmente (só os que têm ano)
        novosLabels = entradas
          .map((entrada, i) => {
            if (!entrada.ano) return null
            const card = firstSetCards[i]
            const center = card ? card.offsetLeft + card.offsetWidth / 2 : 0
            const pos = (center / oneSet) * 100
            return { label: String(entrada.ano), pos, cardIdx: i }
          })
          .filter(Boolean)
      } else {
        // Desktop: label no primeiro card de cada grupo de ano
        const grupos = gruposDeAnos(entradas)
        novosLabels = grupos
          .filter(g => g.ano)
          .map(g => {
            const firstIdx = g.indices[0]
            const card = firstSetCards[firstIdx]
            const center = card ? card.offsetLeft + card.offsetWidth / 2 : 0
            const pos = (center / oneSet) * 100
            return { label: String(g.ano), pos, cardIdx: firstIdx }
          })
      }
      setLabels(novosLabels)
    } else if (!usaCarrossel) {
      const grupos = gruposDeAnos(entradas)
      const novosLabels = grupos
        .filter(g => g.ano)
        .map(g => {
          const firstIdx = g.indices[0]
          const pos = ((firstIdx + 0.5) / n) * 100
          return { label: String(g.ano), pos }
        })
      setLabels(novosLabels)
    }

    const onWheel = (e) => {
      e.preventDefault()
      tiltDeltaRef.current = e.deltaY
      if (usaCarrossel) {
        xRef.current.x -= e.deltaY * 0.5
      }
    }

    // Touch: drag horizontal move o carrossel
    let touchStartX = 0
    let touchStartY = 0
    let touchMoving = false
    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchMoving = true
    }
    const onTouchMove = (e) => {
      if (!touchMoving || !usaCarrossel) return
      const dx = e.touches[0].clientX - touchStartX
      const dy = e.touches[0].clientY - touchStartY
      // só intercepta se movimento predominantemente horizontal
      if (Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault()
        xRef.current.x += dx * 1.2
        tiltDeltaRef.current = -dx * 4
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
      }
    }
    const onTouchEnd = () => { touchMoving = false }

    const isMobile = () => window.innerWidth <= 768

    const tick = () => {
      // Animação para label clicado
      if (xTargetRef.current !== null) {
        const diff = xTargetRef.current - xRef.current.x
        if (Math.abs(diff) < 1) {
          xRef.current.x = xTargetRef.current
          xTargetRef.current = null
        } else {
          xRef.current.x += diff * 0.1
          tiltDeltaRef.current = 0
        }
      }

      const targetTilt = Math.max(-60, Math.min(60, tiltDeltaRef.current * 0.55))
      tilt  += (targetTilt - tilt) * 0.08
      tiltDeltaRef.current *= 0.91

      if (usaCarrossel) {
        if (xRef.current.x < -2 * oneSet) xRef.current.x += oneSet
        if (xRef.current.x > 0)           xRef.current.x -= oneSet
        track.style.transform = `translateX(${xRef.current.x}px)`
        if (timelineTrackRef.current) {
          timelineTrackRef.current.style.transform = `translateX(${xRef.current.x}px)`
        }

        // No mobile: marca cards 100% visíveis
        if (isMobile()) {
          const vw = container.clientWidth
          cards.forEach(card => {
            const rect = card.getBoundingClientRect()
            const visivel = rect.left >= 0 && rect.right <= vw
            card.classList.toggle('cliente-card--visivel', visivel)
          })
        }
      }

      cards.forEach(card => {
        card.style.transform = `perspective(700px) rotateY(${tilt}deg)`
      })

      raf = requestAnimationFrame(tick)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      cancelAnimationFrame(raf)
    }
  }, [n, usaCarrossel, pronto])

  if (!n || !pronto) return (
    <div className="cliente-page">
      <div className="cliente-loading">
        <div className="cliente-loading__spinner" />
      </div>
    </div>
  )

  /* triplica só no carrossel */
  const triplicadas = usaCarrossel
    ? [
        ...entradas.map((e, i) => ({ ...e, _key: `a-${e.id}`, _idx: i })),
        ...entradas.map((e, i) => ({ ...e, _key: `b-${e.id}`, _idx: i })),
        ...entradas.map((e, i) => ({ ...e, _key: `c-${e.id}`, _idx: i })),
      ]
    : entradas.map((e, i) => ({ ...e, _key: e.id, _idx: i }))

  return (
    <div className="cliente-page">

      <header className="cliente-header">
        <button
          className="cliente-header__logo"
          onClick={() => goTo('/')}
          aria-label="Ir para a home"
        >
          {logo && <img src={mediaUrl(logo)} alt="TV1" />}
        </button>
        <MobileMenu logo={logo} logoFiltro="brightness(0)" />
      </header>

      {/* Layout estático (1–3 itens) */}
      {!usaCarrossel && (
        <div
          className={`cliente-static cliente-static--${n}`}
          ref={viewportRef}
        >
          {triplicadas.map(e => (
            <CaseCard
              key={e._key}
              entrada={e}
              idx={e._idx}
              ativo={e._idx === ativoIdx}
              carousel={false}
              clienteSlug={clienteSlug}
            />
          ))}
        </div>
      )}

      {/* Carrossel (4+ itens) */}
      {usaCarrossel && (
        <div className="cliente-viewport" ref={viewportRef}>
          <div className="cliente-track" ref={trackRef}>
            {triplicadas.map(e => (
              <CaseCard
                key={e._key}
                entrada={e}
                idx={e._idx}
                ativo={false}
                carousel={true}
                clienteSlug={clienteSlug}
              />
            ))}
          </div>
        </div>
      )}

      <Timeline
        labels={labels}
        xRef={xRef}
        tiltDeltaRef={tiltDeltaRef}
        timelineTrackRef={timelineTrackRef}
        usaCarrossel={usaCarrossel}
        onLabelClick={handleLabelClick}
      />

    </div>
  )
}
