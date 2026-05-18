import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import MobileMenu from '../components/MobileMenu.jsx'
import '../pages/ClientePage.css'
import './CasesTimeline.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const apiGet = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

const ALTURAS = [460, 340, 400, 310, 380]
const alturaParaIdx = (idx) => ALTURAS[idx % ALTURAS.length]

/* ── monta entradas ── */
function montarEntradas(cases, tipoResolvido) {
  const entradas = []

  if (tipoResolvido === 'quarentaAnos') {
    for (const c of cases) {
      const clienteSlug = c.cliente?.slug
      const caseSlug    = c.slug
      if (c.imagem_capa) {
        entradas.push({
          id:          `${c.id}-main`,
          label:       c.Data ? new Date(c.Data).getFullYear() : null,
          data:        c.Data ? new Date(c.Data) : new Date(0),
          nome:        c.titulo || '',
          capa:        c.imagem_capa,
          href:        clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug ?? ''}`,
          agenciaLogo: null,
          agenciaNome: null,
        })
      }
      for (const bloco of c.blocos ?? []) {
        if (bloco.__component === 'blocks.subcase' && bloco.ancora_id && bloco.imagem) {
          entradas.push({
            id:          `${c.id}-${bloco.ancora_id}`,
            label:       c.Data ? new Date(c.Data).getFullYear() : null,
            data:        c.Data ? new Date(c.Data) : new Date(0),
            nome:        bloco.titulo || '',
            capa:        bloco.imagem,
            href:        clienteSlug && caseSlug
              ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id}`
              : `/${caseSlug ?? ''}#${bloco.ancora_id}`,
            agenciaLogo: null,
            agenciaNome: null,
          })
        }
      }
    }
    return entradas.sort((a, b) => b.data - a.data)
  }

  // marca / especialidade
  for (const c of cases) {
    const clienteSlug = c.cliente?.slug
    const caseSlug    = c.slug
    entradas.push({
      id:          `${c.id}-main`,
      label:       tipoResolvido === 'marca'
        ? (c.Data ? new Date(c.Data).getFullYear() : null)
        : (c.sub_especialidade || ''),
      data:        c.Data ? new Date(c.Data) : new Date(0),
      nome:        c.titulo,
      capa:        c.imagem_capa,
      href:        clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug}`,
      agenciaLogo: c.agencia?.logo ?? null,
      agenciaNome: c.agencia?.nome ?? null,
    })
    for (const bloco of c.blocos ?? []) {
      if (bloco.__component === 'blocks.subtitulo' && bloco.timeline && bloco.timeline_data) {
        entradas.push({
          id:          `${c.id}-sub-${bloco.id}`,
          label:       tipoResolvido === 'marca'
            ? new Date(bloco.timeline_data).getFullYear()
            : (c.sub_especialidade || ''),
          data:        new Date(bloco.timeline_data),
          nome:        bloco.timeline_nome || bloco.texto,
          capa:        bloco.timeline_capa || c.imagem_capa,
          href:        clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id ?? ''}`
            : `/${caseSlug}#${bloco.ancora_id ?? ''}`,
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
        })
      }
    }
  }
  entradas.sort((a, b) => b.data - a.data || 0)
  return entradas
}

/* ── grupos de labels ── */
function gruposDeLabels(entradas) {
  if (!entradas.length) return []
  const mapa = new Map()
  entradas.forEach((e, idx) => {
    const key = String(e.label ?? '')
    if (!mapa.has(key)) mapa.set(key, { label: key, indices: [] })
    mapa.get(key).indices.push(idx)
  })
  return Array.from(mapa.values()).filter(g => g.label)
}

/* ── Card ── */
function CaseCard({ entrada, idx, carousel, navState = null }) {
  const goTo = useGoTo()
  return (
    <div
      className={['cliente-card', 'cliente-card--ativo', carousel ? 'cliente-card--carousel' : ''].join(' ')}
      style={carousel ? { height: alturaParaIdx(idx) } : undefined}
      onClick={() => goTo(entrada.href, null, navState)}
    >
      {entrada.capa && (
        <img src={mediaUrl(entrada.capa)} alt={entrada.nome} className="cliente-card__img" />
      )}
      <div className="cliente-card__overlay">
        <h3 className="cliente-card__titulo">{entrada.nome}</h3>
      </div>
    </div>
  )
}

/* ── Timeline bar ── */
function TimelineBar({ labels, xRef, tiltDeltaRef, timelineTrackRef, usaCarrossel, onLabelClick }) {
  const isDragging = useRef(false)
  const dragStart  = useRef(0)

  useEffect(() => {
    if (!usaCarrossel) return
    const onMove = (e) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStart.current
      dragStart.current = e.clientX
      if (xRef?.current) xRef.current.x += delta
      if (tiltDeltaRef?.current != null) tiltDeltaRef.current = -delta * 4
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [usaCarrossel, xRef, tiltDeltaRef])

  if (usaCarrossel) {
    return (
      <div
        className="timeline timeline--carousel"
        onMouseDown={e => { isDragging.current = true; dragStart.current = e.clientX; e.preventDefault() }}
      >
        <div className="timeline__inner">
          <div className="timeline__ticks">
            {Array.from({ length: 120 }).map((_, i) => <div key={i} className="timeline__tick" />)}
          </div>
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
                    >{l.label}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="timeline">
      <div className="timeline__inner">
        <div className="timeline__ticks">
          {Array.from({ length: 120 }).map((_, i) => <div key={i} className="timeline__tick" />)}
        </div>
        <div className="timeline__labels-static">
          {labels.map((l, i) => (
            <div key={i} className="timeline__label" style={{ left: `${l.pos}%` }}>{l.label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Componente principal ── */
export default function CasesTimeline({
  conteudo,               // 'marca' | 'especialidade' | 'quarentaAnos'
  tipo,                   // retrocompat: 'cliente' | 'especialidade'
  slug,
  contexto = 'case',      // 'pagina' | 'case'
  tema     = 'claro',     // 'claro'  | 'escuro'
  navState = null,
}) {
  // Resolve tipo/conteudo
  const tipoResolvido = conteudo ?? (tipo === 'cliente' ? 'marca' : (tipo ?? 'marca'))

  const [entradas, setEntradas] = useState([])
  const [logo, setLogo]         = useState(null)

  const viewportRef      = useRef(null)
  const trackRef         = useRef(null)
  const timelineTrackRef = useRef(null)
  const xRef             = useRef({ x: 0 })
  const xTargetRef       = useRef(null)
  const firstSetCardsRef = useRef([])
  const oneSetRef        = useRef(0)
  const tiltDeltaRef     = useRef(0)
  const [labels, setLabels] = useState([])

  // Logo para contexto 'pagina' (não quarentaAnos)
  useEffect(() => {
    if (contexto === 'pagina' && tipoResolvido !== 'quarentaAnos') {
      apiGet('logo-site?populate=logo').then(setLogo)
    }
  }, [contexto, tipoResolvido])

  // Aquece cache HTTP
  useEffect(() => {
    if (!slug || tipoResolvido === 'quarentaAnos') return
    try {
      const saved = JSON.parse(localStorage.getItem(`tv1-cases-${tipoResolvido}-${slug}`) ?? '[]')
      saved.forEach(url => { const img = new Image(); img.src = url })
    } catch {}
  }, [tipoResolvido, slug])

  // Fetch de dados
  useEffect(() => {
    if (tipoResolvido === 'quarentaAnos') {
      apiGet(
        'quarenta-anos' +
        '?populate[cases_destaque][populate][imagem_capa]=true' +
        '&populate[cases_destaque][populate][cliente]=true' +
        '&populate[cases_destaque][populate][blocos][populate]=*'
      ).then(data => {
        setEntradas(montarEntradas(data?.cases_destaque ?? [], 'quarentaAnos'))
      })
      return
    }

    if (!slug) return

    const filtro = tipoResolvido === 'especialidade'
      ? `filters[especialidade][slug][$eq]=${slug}`
      : `filters[cliente][slug][$eq]=${slug}`

    axios.get(
      `${STRAPI}/api/cases?${filtro}` +
      `&populate[cliente]=true` +
      `&populate[agencia][populate]=logo` +
      `&populate[especialidade]=true` +
      `&populate[imagem_capa]=true` +
      `&populate[blocos][populate]=*` +
      `&sort=Data:desc`
    )
      .then(r => {
        const novas = montarEntradas(r.data.data ?? [], tipoResolvido)
        setEntradas(novas)
        const urls = novas.map(e => mediaUrl(e.capa)).filter(Boolean)
        try { localStorage.setItem(`tv1-cases-${tipoResolvido}-${slug}`, JSON.stringify(urls)) } catch {}
      })
      .catch(() => {})
  }, [tipoResolvido, slug])

  const n            = entradas.length
  const usaCarrossel = n >= 4

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

  useEffect(() => {
    if (!n) return
    const container = viewportRef.current
    const track     = usaCarrossel ? trackRef.current : viewportRef.current
    if (!container || !track) return

    const oneSet = usaCarrossel ? track.scrollWidth / 3 : 0
    xRef.current.x   = usaCarrossel ? -oneSet : 0
    xTargetRef.current = null
    tiltDeltaRef.current = 0
    let tilt = 0
    let raf

    // Drag com mouse
    let isDragging = false
    let dragStartX = 0
    let dragMoved  = false
    const onMouseDown  = (e) => { isDragging = true; dragMoved = false; dragStartX = e.clientX; container.style.cursor = 'grabbing' }
    const onMouseMove  = (e) => {
      if (!isDragging || !usaCarrossel) return
      const delta = e.clientX - dragStartX
      if (Math.abs(delta) > 3) dragMoved = true
      dragStartX = e.clientX
      xRef.current.x += delta
      tiltDeltaRef.current = -delta * 4
    }
    const onMouseUp = () => { isDragging = false; container.style.cursor = '' }
    const onClickCapture = (e) => { if (dragMoved) { e.stopPropagation(); dragMoved = false } }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('click', onClickCapture, true)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    const cards = Array.from(track.querySelectorAll('.cliente-card'))
    if (usaCarrossel) { firstSetCardsRef.current = cards.slice(0, n); oneSetRef.current = oneSet }

    if (usaCarrossel && timelineTrackRef.current) {
      const sets = timelineTrackRef.current.querySelectorAll('.timeline__labels-set')
      sets.forEach(s => { s.style.width = `${oneSet}px` })
      const firstSetCards = cards.slice(0, n)
      const grupos = gruposDeLabels(entradas)
      setLabels(grupos.map(g => {
        const card   = firstSetCards[g.indices[0]]
        const center = card ? card.offsetLeft + card.offsetWidth / 2 : 0
        return { label: g.label, pos: (center / oneSet) * 100, cardIdx: g.indices[0] }
      }))
    } else if (!usaCarrossel) {
      const grupos = gruposDeLabels(entradas)
      setLabels(grupos.map(g => ({ label: g.label, pos: ((g.indices[0] + 0.5) / n) * 100 })))
    }

    const onWheel = (e) => {
      // Sempre: só scroll horizontal move o carrossel (vertical é livre em ambos os contextos)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && usaCarrossel) {
        e.preventDefault()
        xRef.current.x -= e.deltaX
        tiltDeltaRef.current = -e.deltaX * 4
      }
    }

    const tick = () => {
      if (xTargetRef.current !== null) {
        const diff = xTargetRef.current - xRef.current.x
        if (Math.abs(diff) < 1) { xRef.current.x = xTargetRef.current; xTargetRef.current = null }
        else { const move = diff * 0.1; xRef.current.x += move; tiltDeltaRef.current = -move * 4 }
      }
      const targetTilt = Math.max(-60, Math.min(60, tiltDeltaRef.current * 0.55))
      tilt += (targetTilt - tilt) * 0.08
      tiltDeltaRef.current *= 0.91
      if (usaCarrossel) {
        if (xRef.current.x < -2 * oneSet) xRef.current.x += oneSet
        if (xRef.current.x > 0)           xRef.current.x -= oneSet
        track.style.transform = `translateX(${xRef.current.x}px)`
        if (timelineTrackRef.current) timelineTrackRef.current.style.transform = `translateX(${xRef.current.x}px)`
      }
      cards.forEach(card => { card.style.transform = `perspective(700px) rotateY(${tilt}deg)` })
      raf = requestAnimationFrame(tick)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    raf = requestAnimationFrame(tick)

    return () => {
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      cancelAnimationFrame(raf)
    }
  }, [n, usaCarrossel, contexto])

  if (!n) return null

  const triplicadas = usaCarrossel
    ? [
        ...entradas.map((e, i) => ({ ...e, _key: `a-${e.id}`, _idx: i })),
        ...entradas.map((e, i) => ({ ...e, _key: `b-${e.id}`, _idx: i })),
        ...entradas.map((e, i) => ({ ...e, _key: `c-${e.id}`, _idx: i })),
      ]
    : entradas.map((e, i) => ({ ...e, _key: e.id, _idx: i }))

  const rootClass = [
    'cases-timeline',
    `cases-timeline--${contexto}`,
    tema === 'escuro' ? 'cases-timeline--escuro' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>

      {/* ── Header ── */}
      {tipoResolvido === 'quarentaAnos' && (
        <div className="cases-timeline__header">
          <h2 className="cases-timeline__titulo">
            <span className="cases-timeline__titulo-case">Case</span>
            <span className="cases-timeline__titulo-historicos">históricos</span>
          </h2>
        </div>
      )}
      {contexto === 'pagina' && tipoResolvido !== 'quarentaAnos' && (
        <div className="cases-timeline__header cases-timeline__header--pagina">
          <MobileMenu logo={logo?.logo} logoFiltro="brightness(0)" />
        </div>
      )}

      {/* ── Cards ── */}
      {usaCarrossel ? (
        <div className="cliente-viewport" ref={viewportRef}>
          <div className="cliente-track" ref={trackRef}>
            {triplicadas.map(e => <CaseCard key={e._key} entrada={e} idx={e._idx} carousel navState={navState} />)}
          </div>
        </div>
      ) : (
        <div className={`cliente-static cliente-static--${n}`} ref={viewportRef}>
          {triplicadas.map(e => <CaseCard key={e._key} entrada={e} idx={e._idx} carousel={false} navState={navState} />)}
        </div>
      )}

      {/* ── Timeline bar ── */}
      <TimelineBar
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
