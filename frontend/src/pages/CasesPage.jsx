import { useEffect, useState, useRef } from 'react'
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

async function construirEntradas() {
  const nav = await api('navigation?populate[links][populate][sublinks][populate]=*')
  const linkCases = (nav?.links ?? []).find(
    l => (l.label ?? '').toLowerCase() === 'cases' || l.url === '/cases'
  )
  const sublinks = linkCases?.sublinks ?? []
  const especialidadeSlugs = new Set()
  const secoes = []
  const ordemSublink = {}
  for (let subIdx = 0; subIdx < sublinks.length; subIdx++) {
    const sub = sublinks[subIdx]
    const subSlug  = sub.especialidade?.slug || sub.slug || (sub.label ?? '').toLowerCase().replace(/\s+/g, '-')
    const esps     = sub.especialidade ? [sub.especialidade] : []
    ordemSublink[subSlug] = subIdx
    for (const e of esps) {
      if (e.slug) {
        especialidadeSlugs.add(e.slug)
        secoes.push({ tipo: 'esp', slug: e.slug, label: e.nome, parentSublinkSlug: subSlug })
        ordemSublink[e.slug] = subIdx
      }
    }
  }
  if (especialidadeSlugs.size === 0) {
    return { entradas: [], map: {} }
  }
  const slugFilters = Array.from(especialidadeSlugs)
    .map(s => `filters[especialidade][slug][$in]=${encodeURIComponent(s)}`)
    .join('&')
  const queries = [
    axios.get(
      `${STRAPI}/api/cases?${slugFilters}` +
      `&populate[especialidade]=true&populate[sub_especialidade]=true&populate[cliente]=true&populate[agencia]=true` +
      `&populate[imagem_capa]=true&populate[imagem_timeline]=true` +
      `&populate[blocos][populate]=*` +
      `&pagination[pageSize]=200&sort=Data:desc`
    ).then(r => r.data.data ?? []).catch(() => [])
  ]
  const resultados = await Promise.all(queries)
  const casesMap = new Map()
  for (const lista of resultados) for (const c of lista) casesMap.set(c.id, c)
  const cases = Array.from(casesMap.values())
  const entradas = []
  for (const c of cases) {
    const clienteSlug = c.cliente?.slug
    const caseSlug    = c.slug
    let ancora = ''
    let secaoLabel = ''
    const especialidadeSlug = c.especialidade?.slug
    if (especialidadeSlug && especialidadeSlugs.has(especialidadeSlug)) {
      ancora = especialidadeSlug
      const sec = secoes.find(s => s.slug === especialidadeSlug)
      secaoLabel = sec?.label || c.especialidade?.nome || ''
    }
    const ordemSub = c.sub_especialidade?.ordem ?? 9999
    const label    = c.sub_especialidade?.nome || secaoLabel
    entradas.push({
      id:            `${c.id}-main`,
      ancora,
      subEspAncora:  c.sub_especialidade?.slug || null,
      label,
      ordemSub,
      data:          c.Data ? new Date(c.Data) : new Date(0),
      nome:          c.titulo_timeline || c.titulo,
      capa:          c.imagem_timeline || c.imagem_capa,
      href:          clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug}`,
      agenciaLogo:   c.agencia?.logo ?? null,
      agenciaNome:   c.agencia?.nome ?? null,
    })
    // Subtítulos/subcases com dados próprios de timeline aparecem como
    // entradas adicionais, na mesma categoria (especialidade) do case-pai.
    for (const bloco of c.blocos ?? []) {
      if (bloco.__component === 'blocks.subtitulo' && bloco.timeline && bloco.timeline_data && bloco.visivel !== false) {
        entradas.push({
          id:            `${c.id}-sub-${bloco.id}`,
          ancora,
          subEspAncora:  c.sub_especialidade?.slug || null,
          label,
          ordemSub,
          data:          new Date(bloco.timeline_data),
          nome:          bloco.timeline_nome || bloco.texto,
          capa:          bloco.timeline_capa || c.imagem_capa,
          href:          clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id ?? ''}`
            : `/${caseSlug}#${bloco.ancora_id ?? ''}`,
          agenciaLogo:   c.agencia?.logo ?? null,
          agenciaNome:   c.agencia?.nome ?? null,
        })
      }
      if (bloco.__component === 'blocks.subcase' && bloco.ancora_id && bloco.visivel !== false) {
        const blocoCapa = bloco.imagem_timeline || bloco.imagem_capa
        if (!blocoCapa) continue
        entradas.push({
          id:            `${c.id}-sub-${bloco.id}`,
          ancora,
          subEspAncora:  c.sub_especialidade?.slug || null,
          label,
          ordemSub,
          data:          bloco.Data ? new Date(bloco.Data) : (c.Data ? new Date(c.Data) : new Date(0)),
          nome:          bloco.titulo_timeline || bloco.titulo,
          capa:          blocoCapa,
          href:          clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id}`
            : `/${caseSlug}#${bloco.ancora_id}`,
          agenciaLogo:   c.agencia?.logo ?? null,
          agenciaNome:   c.agencia?.nome ?? null,
        })
      }
      if (bloco.__component === 'blocks.video' && bloco.ir_para_timeline && bloco.ancora_id && bloco.visivel !== false) {
        const videoCapa = bloco.imagem_timeline || bloco.capa
        if (!videoCapa) continue
        entradas.push({
          id:            `${c.id}-sub-${bloco.id}`,
          ancora,
          subEspAncora:  c.sub_especialidade?.slug || null,
          label,
          ordemSub,
          data:          c.Data ? new Date(c.Data) : new Date(0),
          nome:          bloco.titulo,
          capa:          videoCapa,
          href:          clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id}`
            : `/${caseSlug}#${bloco.ancora_id}`,
          agenciaLogo:   c.agencia?.logo ?? null,
          agenciaNome:   c.agencia?.nome ?? null,
        })
      }
    }
  }
  // Ordem da timeline:
  //   1. Ordem do sublink no menu (live marketing → conteúdo → advertising…)
  //   2. Dentro da área: ordem do campo `ordem` da sub-especialidade no CMS
  //   3. Dentro do label: mais novo primeiro
  entradas.sort((a, b) => {
    const oa = ordemSublink[a.ancora] ?? 9999
    const ob = ordemSublink[b.ancora] ?? 9999
    if (oa !== ob) return oa - ob
    if (a.ordemSub !== b.ordemSub) return a.ordemSub - b.ordemSub
    return b.data - a.data
  })
  const map = {}
  // Âncora por sub-especialidade slug (ex: #ativacao)
  for (const e of entradas) if (e.subEspAncora && !map[e.subEspAncora]) map[e.subEspAncora] = e.id
  // Âncora por especialidade: se a área tem subs, aponta pro primeiro case com sub;
  // se não tem, aponta pro primeiro case da área
  for (const e of entradas) {
    if (!e.ancora) continue
    if (!map[e.ancora]) {
      map[e.ancora] = e.id
    } else if (e.subEspAncora && !entradas.find(x => x.id === map[e.ancora])?.subEspAncora) {
      map[e.ancora] = e.id
    }
  }
  return { entradas, map }
}

/**
 * Página unificada de Cases.
 *
 * Carrega a Navegação, acha o link "Cases" (por slug/label) e coleta todas as
 * entradas que devem aparecer na timeline:
 *   - Para cada sublink COM especialidades: gera uma "seção" por especialidade,
 *     com âncora = especialidade.slug
 *   - Para cada sublink SEM especialidades (mas com cases próprios): uma seção
 *     usando os cases do próprio sublink, âncora = sublink.slug
 *
 * Depois faz UM fetch de cases filtrando por todos os slugs/ids coletados, monta
 * entradas com âncoras e passa pro CasesTimeline.
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

  // Bloco antigo de fetch in-line — agora vive em construirEntradas() e
  // prefetchCases() lá em cima. Mantido aqui só pra não quebrar o restante
  // do componente, sai num cleanup futuro:
  useEffect(() => {
    if (true) return // disabled — fetch via prefetchCases()
    async function carregar() {
      // 1. Navegação com sublinks populados (1 fetch, populate=* funciona)
      const nav = await api('navigation?populate[links][populate][sublinks][populate]=*')
      const linkCases = (nav?.links ?? []).find(
        l => (l.label ?? '').toLowerCase() === 'cases' || l.url === '/cases'
      )
      const sublinks = linkCases?.sublinks ?? []

      // 2. Coleta todos os slugs de especialidades e ids de sublink-cases
      const especialidadeSlugs = new Set()
      const sublinkCasesIds    = new Set()
      // [{ tipo: 'esp'|'sub', slug: ..., label: ..., parentSublinkSlug: ... }]
      const secoes = []

      for (const sub of sublinks) {
        const subSlug  = sub.especialidade?.slug || sub.slug || (sub.label ?? '').toLowerCase().replace(/\s+/g, '-')
        const esps     = sub.especialidade ? [sub.especialidade] : []
        for (const e of esps) {
          if (e.slug) {
            especialidadeSlugs.add(e.slug)
            secoes.push({ tipo: 'esp', slug: e.slug, label: e.nome, parentSublinkSlug: subSlug })
          }
        }
      }

      if (especialidadeSlugs.size === 0 && sublinkCasesIds.size === 0) {
        setEntradasPre([])
        return
      }

      // 3. Fetch dos cases. Faz duas queries em paralelo (uma por especialidade,
      // outra por ids) — depois junta sem duplicatas.
      const queries = []
      if (especialidadeSlugs.size > 0) {
        const slugFilters = Array.from(especialidadeSlugs)
          .map(s => `filters[especialidade][slug][$in]=${encodeURIComponent(s)}`)
          .join('&')
        queries.push(axios.get(
          `${STRAPI}/api/cases?${slugFilters}&populate=*&pagination[pageSize]=200&sort=Data:desc`
        ).then(r => r.data.data ?? []).catch(() => []))
      }
      if (sublinkCasesIds.size > 0) {
        const idFilters = Array.from(sublinkCasesIds)
          .map(id => `filters[id][$in]=${id}`)
          .join('&')
        queries.push(axios.get(
          `${STRAPI}/api/cases?${idFilters}&populate=*&pagination[pageSize]=200&sort=Data:desc`
        ).then(r => r.data.data ?? []).catch(() => []))
      }
      const resultados = await Promise.all(queries)
      const casesMap = new Map()
      for (const lista of resultados) {
        for (const c of lista) casesMap.set(c.id, c)
      }
      const cases = Array.from(casesMap.values())

      // 4. Monta entradas (1 por case + 1 por subtitulo timeline em blocos)
      const entradas = []
      for (const c of cases) {
        const clienteSlug = c.cliente?.slug
        const caseSlug    = c.slug
        // Descobre âncora E label da seção: 1ª seção que contém esse case
        let ancora = ''
        let secaoLabel = ''
        const especialidadeSlug = c.especialidade?.slug
        if (especialidadeSlug && especialidadeSlugs.has(especialidadeSlug)) {
          ancora = especialidadeSlug
          // pega o nome legível da especialidade na seção correspondente
          const sec = secoes.find(s => s.tipo === 'esp' && s.slug === especialidadeSlug)
          secaoLabel = sec?.label || c.especialidade?.nome || ''
        } else {
          for (const secao of secoes) {
            if (secao.tipo === 'sub' && secao.caseIds?.includes(c.id)) {
              ancora = secao.slug
              secaoLabel = secao.label
              break
            }
          }
        }
        entradas.push({
          id:          `${c.id}-main`,
          ancora,
          // Label da timeline = nome da especialidade/sublink (não o ano)
          label:       secaoLabel,
          data:        c.Data ? new Date(c.Data) : new Date(0),
          nome:        c.titulo,
          capa:        c.imagem_capa,
          href:        clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug}`,
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
        })
      }
      entradas.sort((a, b) => b.data - a.data)

      // Mapeia âncora → id da primeira entrada com essa âncora (e cobre o caso
      // do parent sublink → sua primeira especialidade)
      const map = {}
      for (const e of entradas) {
        if (e.ancora && !map[e.ancora]) map[e.ancora] = e.id
      }
      for (const secao of secoes) {
        if (secao.tipo === 'esp' && !map[secao.parentSublinkSlug] && map[secao.slug]) {
          map[secao.parentSublinkSlug] = map[secao.slug]
        }
      }

      setAnchorMap(map)
      setEntradasPre(entradas)
    }
    carregar()
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
