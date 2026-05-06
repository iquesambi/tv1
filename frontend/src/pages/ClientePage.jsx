import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import './ClientePage.css'

const STRAPI = 'http://localhost:1337'
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

/* ── monta entradas (principal + âncoras de subtítulo) ── */
function montarEntradas(cases) {
  const entradas = []
  for (const c of cases) {
    const clienteSlug = c.cliente?.slug
    const caseSlug    = c.slug

    if (c.Data) {
      entradas.push({
        id:          `${c.id}-main`,
        ano:         new Date(c.Data).getFullYear(),
        data:        new Date(c.Data),
        nome:        c.titulo,
        capa:        c.imagem_capa,
        href:        `/${clienteSlug}/${caseSlug}`,
        agenciaLogo: c.agencia?.logo ?? null,
        agenciaNome: c.agencia?.nome ?? null,
      })
    }

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
  entradas.sort((a, b) => a.data - b.data)
  return entradas
}

/* ── labels da timeline: anos de 2 em 2, distribuídos igualmente ── */
function labelsDaTimeline(entradas) {
  if (!entradas.length) return []
  // Pega todos os anos únicos do range
  const anos = [...new Set(entradas.map(e => e.ano))].sort((a, b) => a - b)
  if (!anos.length) return []
  const min = anos[0]
  const max = anos[anos.length - 1]
  // Gera anos de 2 em 2 dentro do range
  const labels = []
  for (let ano = min; ano <= max; ano += 2) {
    labels.push(String(ano))
  }
  // garante que o último ano apareça
  if (labels[labels.length - 1] !== String(max)) labels.push(String(max))
  return labels
}

/* ── índice do card "ativo" para layouts estáticos ── */
function ativoIdxParaN(n) {
  if (n <= 1) return 0
  if (n === 2) return 1   // rightmost
  return 1                // center (para n=3, idx 1 = centro)
}

/* ── alturas alternadas para o carrossel ── */
const ALTURAS = [387, 287, 340, 260, 320]
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

      {/* Logo da agência — canto superior direito */}
      {entrada.agenciaLogo && (
        <div className="cliente-card__agencia">
          <img src={mediaUrl(entrada.agenciaLogo)} alt={entrada.agenciaNome ?? ''} />
        </div>
      )}

      {/* Overlay com título: sempre visível no ativo, só no hover para inativos */}
      <div className="cliente-card__overlay">
        <h3 className="cliente-card__titulo">{entrada.nome}</h3>
      </div>
    </div>
  )
}

/* ── Timeline ── */
function Timeline({ labels, xRef, timelineTrackRef, usaCarrossel }) {
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
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [usaCarrossel, xRef])

  // Carrossel: ticks fixos, mas labels (anos) deslizam dentro do viewport 1366px
  if (usaCarrossel) {
    return (
      <div
        className="timeline timeline--carousel"
        onMouseDown={handleMouseDown}
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
                  {labels.map((label, i) => (
                    <div key={i} className="timeline__label">
                      {label}
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
        <div className="timeline__labels timeline__labels--static">
          {labels.map((label, i) => (
            <div key={i} className="timeline__label">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Página ── */
export default function ClientePage() {
  const { cliente: clienteSlug } = useParams()
  const [entradas, setEntradas]  = useState([])
  const [logo, setLogo]          = useState(null)
  const viewportRef = useRef(null)
  const trackRef    = useRef(null)
  const timelineTrackRef = useRef(null)
  // ref compartilhado entre o tick e o drag da timeline
  const xRef = useRef({ x: 0 })

  /* fetch logo do site */
  useEffect(() => {
    axios.get(`${STRAPI}/api/logo-site?populate=logo`)
      .then(r => setLogo(r.data.data?.logo ?? null))
      .catch(() => {})
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
  const labels      = labelsDaTimeline(entradas)

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
    let delta = 0
    let tilt  = 0
    let raf

    let cards = Array.from(track.querySelectorAll('.cliente-card'))

    // Sincroniza largura dos sets de labels com oneSet do carrossel (para loop infinito)
    if (usaCarrossel && timelineTrackRef.current) {
      const sets = timelineTrackRef.current.querySelectorAll('.timeline__labels-set')
      sets.forEach(s => { s.style.flex = `0 0 ${oneSet}px` })
    }

    const onWheel = (e) => {
      e.preventDefault()
      delta = e.deltaY
      if (usaCarrossel) {
        xRef.current.x -= e.deltaY * 0.5
      }
    }

    const tick = () => {
      const targetTilt = Math.max(-60, Math.min(60, delta * 0.55))
      tilt  += (targetTilt - tilt) * 0.08
      delta *= 0.91

      if (usaCarrossel) {
        // mantém o loop infinito clamping o x
        if (xRef.current.x < -2 * oneSet) xRef.current.x += oneSet
        if (xRef.current.x > 0)           xRef.current.x -= oneSet
        track.style.transform = `translateX(${xRef.current.x}px)`
        // sincroniza os labels da timeline com a mesma velocidade
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
        <div className="cliente-header__logo">
          {logo && <img src={mediaUrl(logo)} alt="TV1" />}
        </div>
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
        timelineTrackRef={timelineTrackRef}
        usaCarrossel={usaCarrossel}
      />

    </div>
  )
}
