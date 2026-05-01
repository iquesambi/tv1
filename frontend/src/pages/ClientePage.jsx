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
        id:   `${c.id}-main`,
        ano:  new Date(c.Data).getFullYear(),
        data: new Date(c.Data),
        nome: c.titulo,
        capa: c.imagem_capa,
        href: `/${clienteSlug}/${caseSlug}`,
      })
    }

    for (const bloco of c.blocos ?? []) {
      if (
        bloco.__component === 'blocks.subtitulo' &&
        bloco.timeline &&
        bloco.timeline_data
      ) {
        entradas.push({
          id:   `${c.id}-sub-${bloco.id}`,
          ano:  new Date(bloco.timeline_data).getFullYear(),
          data: new Date(bloco.timeline_data),
          nome: bloco.timeline_nome || bloco.texto,
          capa: bloco.timeline_capa || c.imagem_capa,
          href: `/${clienteSlug}/${caseSlug}#${bloco.ancora_id ?? ''}`,
        })
      }
    }
  }
  entradas.sort((a, b) => a.data - b.data)
  return entradas
}

/* ── posição do ano na timeline (%) ── */
function posicaoAno(ano, todos) {
  if (todos.length === 1) return 50
  const min = Math.min(...todos)
  const max = Math.max(...todos)
  if (min === max) return 50
  return ((ano - min) / (max - min)) * 85 + 7.5
}

/* ── alturas alternadas estáveis por entrada ── */
const ALTURAS = [387, 287, 340, 260, 320]
function alturaParaIdx(idx) { return ALTURAS[idx % ALTURAS.length] }

/* ── Card ── */
function CaseCard({ entrada, idx }) {
  const goTo = useGoTo()
  return (
    <div
      className="cliente-card"
      style={{ height: alturaParaIdx(idx) }}
      onClick={() => goTo(entrada.href)}
    >
      {entrada.capa && (
        <img src={mediaUrl(entrada.capa)} alt={entrada.nome} className="cliente-card__img" />
      )}
      <div className="cliente-card__overlay">
        <span className="cliente-card__ano">{entrada.ano}</span>
        <h3 className="cliente-card__titulo">{entrada.nome}</h3>
      </div>
    </div>
  )
}

/* ── Timeline ── */
function Timeline({ anosUnicos }) {
  return (
    <div className="timeline">
      <div className="timeline__ticks">
        {Array.from({ length: 120 }).map((_, i) => (
          <div key={i} className="timeline__tick" />
        ))}
      </div>
      <div className="timeline__anos">
        {anosUnicos.map(ano => (
          <div
            key={ano}
            className="timeline__ano"
            style={{ left: `${posicaoAno(ano, anosUnicos)}%` }}
          >
            {ano}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Página ── */
export default function ClientePage() {
  const { cliente: clienteSlug } = useParams()
  const [entradas, setEntradas] = useState([])
  const viewportRef = useRef(null)
  const trackRef    = useRef(null)

  /* fetch */
  useEffect(() => {
    axios
      .get(
        `${STRAPI}/api/cases` +
        `?filters[cliente][slug][$eq]=${clienteSlug}` +
        `&populate[cliente]=true` +
        `&populate[agencia]=true` +
        `&populate[imagem_capa]=true` +
        `&populate[blocos][populate]=*` +
        `&sort=Data:asc`
      )
      .then(r => setEntradas(montarEntradas(r.data.data ?? [])))
      .catch(() => {})
  }, [clienteSlug])

  /* scroll horizontal infinito + tilt individual por card */
  useEffect(() => {
    if (!entradas.length) return
    const viewport = viewportRef.current
    const track    = trackRef.current
    if (!viewport || !track) return

    const oneSet = track.scrollWidth / 3

    let x     = -oneSet
    let delta = 0
    let tilt  = 0
    let raf

    // coleta os cards uma vez (evita query por frame)
    let cards = Array.from(track.querySelectorAll('.cliente-card'))

    const onWheel = (e) => {
      e.preventDefault()
      delta = e.deltaY
      x -= e.deltaY * 0.5
      if (x < -2 * oneSet) x += oneSet
      if (x > 0)           x -= oneSet
    }

    const tick = () => {
      // tilt suave com inércia
      const targetTilt = Math.max(-60, Math.min(60, delta * 0.55))
      tilt  += (targetTilt - tilt) * 0.08
      delta *= 0.91

      // track só translada horizontalmente
      track.style.transform = `translateX(${x}px)`

      // cada card gira no próprio eixo Y, com perspectiva própria
      cards.forEach(card => {
        card.style.transform = `perspective(700px) rotateY(${tilt}deg)`
      })

      raf = requestAnimationFrame(tick)
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    raf = requestAnimationFrame(tick)

    return () => {
      viewport.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(raf)
    }
  }, [entradas])

  if (!entradas.length) return <div className="cliente-page"><div className="cliente-loading">Carregando...</div></div>

  /* triplica as entradas para o loop infinito */
  const triplicadas = [
    ...entradas.map((e, i) => ({ ...e, _key: `a-${e.id}`, _idx: i })),
    ...entradas.map((e, i) => ({ ...e, _key: `b-${e.id}`, _idx: i })),
    ...entradas.map((e, i) => ({ ...e, _key: `c-${e.id}`, _idx: i })),
  ]

  const anosUnicos = [...new Set(entradas.map(e => e.ano))].sort((a, b) => a - b)

  return (
    <div className="cliente-page">

      <header className="cliente-header">
        <span className="cliente-header__logo">TV1</span>
      </header>

      {/* viewport com perspectiva — intercepta o wheel */}
      <div className="cliente-viewport" ref={viewportRef}>
        <div className="cliente-track" ref={trackRef}>
          {triplicadas.map(e => (
            <CaseCard key={e._key} entrada={e} idx={e._idx} />
          ))}
        </div>
      </div>

      <Timeline anosUnicos={anosUnicos} />

    </div>
  )
}
