import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import './ClientePage.css' // reusa estilos da ClientePage

const STRAPI = 'https://tv1-53ev.onrender.com'
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

/* ── monta entradas (principal + âncoras de subtítulo) ── */
function montarEntradas(cases) {
  // Primeiro monta grupos por case (principal + subtítulos juntos)
  const grupos = []

  for (const c of cases) {
    const clienteSlug = c.cliente?.slug
    const caseSlug    = c.slug
    const dataCase    = c.Data ? new Date(c.Data) : null
    if (!dataCase) continue

    const itens = []

    // Card principal do case
    itens.push({
      id:               `${c.id}-main`,
      data:             dataCase,
      subEspecialidade: c.sub_especialidade || c.subEspecialidade || '',
      nome:             c.titulo,
      capa:             c.imagem_capa,
      href:             `/${clienteSlug}/${caseSlug}`,
      agenciaLogo:      c.agencia?.logo ?? null,
      agenciaNome:      c.agencia?.nome ?? null,
    })

    // Subtítulos do case
    for (const bloco of c.blocos ?? []) {
      if (
        bloco.__component === 'blocks.subtitulo' &&
        bloco.timeline &&
        bloco.timeline_data
      ) {
        itens.push({
          id:               `${c.id}-sub-${bloco.id}`,
          data:             new Date(bloco.timeline_data),
          subEspecialidade: c.sub_especialidade || c.subEspecialidade || '',
          nome:             bloco.timeline_nome || bloco.texto,
          capa:             bloco.timeline_capa || c.imagem_capa,
          href:             `/${clienteSlug}/${caseSlug}#${bloco.ancora_id ?? ''}`,
          agenciaLogo:      c.agencia?.logo ?? null,
          agenciaNome:      c.agencia?.nome ?? null,
        })
      }
    }

    // Dentro do grupo, ordena por data dos itens (mais novo primeiro)
    itens.sort((a, b) => b.data - a.data)

    grupos.push({ dataCase, itens })
  }

  // Ordena os grupos pela data principal do case (mais novo primeiro)
  grupos.sort((a, b) => b.dataCase - a.dataCase)

  // Achata os grupos em uma lista plana
  return grupos.flatMap(g => g.itens)
}

/* ── grupos de sub-especialidades (todas com mesma sub, independente posição) ── */
function gruposDeSubEspecialidades(entradas) {
  if (!entradas.length) return []
  const mapa = new Map()
  entradas.forEach((entrada, idx) => {
    const sub = entrada.subEspecialidade
    if (!mapa.has(sub)) {
      mapa.set(sub, { sub, indices: [] })
    }
    mapa.get(sub).indices.push(idx)
  })
  return Array.from(mapa.values())
}

/* ── índice do card "ativo" para layouts estáticos ── */
function ativoIdxParaN(n) {
  if (n <= 1) return 0
  if (n === 2) return 1
  return 1
}

/* ── alturas alternadas para o carrossel ── */
const ALTURAS = [460, 340, 400, 310, 380]
function alturaParaIdx(idx) { return ALTURAS[idx % ALTURAS.length] }

/* ── Card ── */
function CaseCard({ entrada, idx, ativo = false, carousel = false }) {
  const goTo = useGoTo()
  return (
    <div
      className={[
        'cliente-card',
        ativo     ? 'cliente-card--ativo'    : 'cliente-card--inativo',
        carousel  ? 'cliente-card--carousel' : '',
      ].join(' ')}
      style={carousel ? { height: alturaParaIdx(idx) } : undefined}
      onClick={() => goTo(entrada.href)}
    >
      {entrada.capa && (
        <img src={mediaUrl(entrada.capa)} alt={entrada.nome} className="cliente-card__img" />
      )}

      {entrada.agenciaLogo && (
        <div className="cliente-card__agencia">
          <img src={mediaUrl(entrada.agenciaLogo)} alt={entrada.agenciaNome ?? ''} />
        </div>
      )}

      <div className="cliente-card__overlay">
        <h3 className="cliente-card__titulo">{entrada.nome}</h3>
      </div>
    </div>
  )
}

/* ── Timeline ── */
function Timeline({ labels, xRef, tiltDeltaRef, timelineTrackRef, usaCarrossel }) {
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

  if (usaCarrossel) {
    return (
      <div
        className="timeline timeline--carousel"
        onMouseDown={handleMouseDown}
      >
        <div className="timeline__inner">
          <div className="timeline__ticks">
            {Array.from({ length: 120 }).map((_, i) => (
              <div key={i} className="timeline__tick" />
            ))}
          </div>
          <div className="timeline__labels-viewport">
            <div className="timeline__labels-track" ref={timelineTrackRef}>
              {[0, 1, 2].map(setIdx => (
                <div className="timeline__labels-set" key={setIdx}>
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
export default function EspecialidadePage() {
  const { especialidade: especialidadeSlug } = useParams()
  const [entradas, setEntradas]  = useState([])
  const [logo, setLogo]          = useState(null)
  const viewportRef = useRef(null)
  const trackRef    = useRef(null)
  const timelineTrackRef = useRef(null)
  const xRef = useRef({ x: 0 })
  const tiltDeltaRef = useRef(0)
  const goTo = useGoTo()

  /* fetch logo do site */
  useEffect(() => {
    axios.get(`${STRAPI}/api/logo-site?populate=logo`)
      .then(r => setLogo(r.data.data?.logo ?? null))
      .catch(() => {})
    document.body.classList.remove('scroll-locked')
  }, [])

  /* fetch — cases filtrados por especialidade (via relation) */
  useEffect(() => {
    axios
      .get(
        `${STRAPI}/api/cases` +
        `?filters[especialidade][slug][$eq]=${especialidadeSlug}` +
        `&populate[cliente]=true` +
        `&populate[agencia][populate]=logo` +
        `&populate[especialidade]=true` +
        `&populate[imagem_capa]=true` +
        `&populate[blocos][populate]=*` +
        `&sort=Data:desc`
      )
      .then(r => setEntradas(montarEntradas(r.data.data ?? [])))
      .catch(() => {})
  }, [especialidadeSlug])

  const n            = entradas.length
  const usaCarrossel = n >= 4
  const ativoIdx     = usaCarrossel ? -1 : ativoIdxParaN(n)

  const [labels, setLabels] = useState([])

  useEffect(() => {
    if (!n) return
    const container = viewportRef.current
    const track = usaCarrossel ? trackRef.current : viewportRef.current
    if (!container || !track) return

    const oneSet = usaCarrossel ? track.scrollWidth / 3 : 0
    xRef.current.x = usaCarrossel ? -oneSet : 0
    tiltDeltaRef.current = 0
    let tilt  = 0
    let raf

    let cards = Array.from(track.querySelectorAll('.cliente-card'))

    if (usaCarrossel && timelineTrackRef.current) {
      const sets = timelineTrackRef.current.querySelectorAll('.timeline__labels-set')
      sets.forEach(s => { s.style.width = `${oneSet}px` })

      // Label alinhado com o PRIMEIRO card de cada grupo (consecutivo da mesma sub-especialidade)
      const firstSetCards = cards.slice(0, n)
      const grupos = gruposDeSubEspecialidades(entradas)
      const novosLabels = grupos
        .filter(g => g.sub) // ignora grupos sem sub-especialidade
        .map(g => {
          const firstIdx = g.indices[0]
          const card = firstSetCards[firstIdx]
          const center = card ? card.offsetLeft + card.offsetWidth / 2 : 0
          const pos = (center / oneSet) * 100
          return { label: g.sub, pos }
        })
      setLabels(novosLabels)
    } else if (!usaCarrossel) {
      const grupos = gruposDeSubEspecialidades(entradas)
      const novosLabels = grupos
        .filter(g => g.sub)
        .map(g => {
          const firstIdx = g.indices[0]
          const pos = ((firstIdx + 0.5) / n) * 100
          return { label: g.sub, pos }
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

    const tick = () => {
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
      }

      cards.forEach(card => {
        card.style.transform = `perspective(700px) rotateY(${tilt}deg)`
      })

      raf = requestAnimationFrame(tick)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    raf = requestAnimationFrame(tick)

    return () => {
      container.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(raf)
    }
  }, [n, usaCarrossel])

  if (!n) return (
    <div className="cliente-page">
      <div className="cliente-loading">Carregando...</div>
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
      />

    </div>
  )
}
