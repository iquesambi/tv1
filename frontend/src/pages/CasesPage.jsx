import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import CasesTimeline from '../components/CasesTimeline.jsx'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)

// Cache em memória: nav + entradas montadas. Compartilhado com o prefetch.
let entradasCache = null
let anchorMapCache = null
let prefetchPromise = null

export function prefetchCases() {
  if (prefetchPromise) return prefetchPromise
  prefetchPromise = construirEntradas().then(({ entradas, map }) => {
    entradasCache  = entradas
    anchorMapCache = map
  }).catch(() => { prefetchPromise = null })
  return prefetchPromise
}

// Diz se uma âncora (slug de especialidade/sub) tem ao menos um case na
// timeline unificada. Retorna true/false quando o cache já carregou, ou null
// se ainda não sabemos (cache não montado) — nesse caso quem chama decide o
// fallback. Só conta cases que de fato aparecem (com imagem).
export function casesAnchorDisponivel(ancora) {
  if (!anchorMapCache) return null
  return Boolean(anchorMapCache[ancora])
}

// Retorna o cache já montado (ou null se ainda não carregou).
// Usado por CasePage pra embutir a timeline unificada sem re-fetch.
export function getEntradasCache() {
  return { entradas: entradasCache, anchorMap: anchorMapCache }
}

// A montagem das entradas (juntar navegação + cases, agrupar por
// especialidade, ordenar) roda no servidor agora — ver
// backend/src/cases-timeline-cache.ts — e fica cacheada em memória lá,
// invalidada automaticamente quando o conteúdo muda. Aqui só busca o
// resultado já pronto e converte a data (string) de volta pra Date.
async function construirEntradas() {
  const resultado = await api('cases-timeline')
  if (!resultado) return { entradas: [], map: {} }
  const entradas = (resultado.entradas ?? []).map(e => ({
    ...e,
    data: e.data ? new Date(e.data) : new Date(0),
  }))
  return { entradas, map: resultado.map ?? {} }
}

/**
 * Página unificada de Cases. As entradas (uma por case/seção, com âncoras)
 * já vêm prontas do backend — ver construirEntradas() acima.
 */
export default function CasesPage() {
  const location = useLocation()
  const [entradasPre, setEntradasPre] = useState(entradasCache)  // usa cache se houver
  const [anchorMap, setAnchorMap]     = useState(anchorMapCache ?? {})

  useEffect(() => {
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    // Se já temos cache, pula o fetch
    if (entradasCache && anchorMapCache) return
    prefetchCases().then(() => {
      if (entradasCache) setEntradasPre(entradasCache)
      if (anchorMapCache) setAnchorMap(anchorMapCache)
    })
  }, [])

  // Posiciona a timeline ao montar e quando o hash muda (via React Router).
  // Tenta repetidamente até a timeline ter os cards montados.
  useEffect(() => {
    if (!entradasPre) return
    const hash = location.hash.slice(1)
    const targetId = hash ? anchorMap[hash] : entradasPre[0]?.id
    if (!targetId) return
    let tentativas = 0
    const tentar = () => {
      const card = document.querySelector('.cliente-card')
      if (card) {
        window.dispatchEvent(new CustomEvent('cases-align-left', { detail: { entryId: targetId } }))
        if (hash) {
          const limparHash = { once: true }
          const clearHash = () => history.replaceState(null, '', location.pathname)
          window.addEventListener('wheel', clearHash, limparHash)
          window.addEventListener('touchstart', clearHash, limparHash)
        }
        return
      }
      if (++tentativas < 30) setTimeout(tentar, 100)
    }
    tentar()
  }, [location.hash, entradasPre, anchorMap])

  if (entradasPre === null) {
    return (
      <div className="cases-timeline cases-timeline--case" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cliente-loading__spinner" />
      </div>
    )
  }

  return (
    <CasesTimeline
      conteudo="unified"
      contexto="pagina"
      tema="claro"
      entradasPre={entradasPre}
      anchorMap={anchorMap}
    />
  )
}
