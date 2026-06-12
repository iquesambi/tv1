import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import CasesTimeline from '../components/CasesTimeline.jsx'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)

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
  const [entradasPre, setEntradasPre] = useState(null) // null = loading
  const [anchorMap, setAnchorMap]     = useState({})   // slug -> primeiro id de entrada
  const hashAtivoRef = useRef('')

  useEffect(() => {
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    async function carregar() {
      // 1. Navegação com tudo populado
      const nav = await api(
        'navigation?populate[links][populate][sublinks][populate][especialidades]=*' +
        '&populate[links][populate][sublinks][populate][cases][populate]=imagem_capa' +
        '&populate[links][populate][sublinks][populate][cases][populate]=cliente' +
        '&populate[links][populate][sublinks][populate][cases][populate]=agencia'
      )
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
        const subSlug  = sub.slug || (sub.label ?? '').toLowerCase().replace(/\s+/g, '-')
        const esps     = sub.especialidades ?? []
        const subCases = sub.cases ?? []
        if (esps.length > 0) {
          for (const e of esps) {
            if (e.slug) {
              especialidadeSlugs.add(e.slug)
              secoes.push({ tipo: 'esp', slug: e.slug, label: e.nome, parentSublinkSlug: subSlug })
            }
          }
        } else if (subCases.length > 0) {
          for (const c of subCases) sublinkCasesIds.add(c.id)
          secoes.push({ tipo: 'sub', slug: subSlug, label: sub.label, caseIds: subCases.map(c => c.id) })
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
          `${STRAPI}/api/cases?${slugFilters}` +
          `&populate[cliente]=true` +
          `&populate[especialidade]=true` +
          `&populate[agencia][populate]=logo` +
          `&populate[imagem_capa]=true` +
          `&populate[blocos][populate]=*` +
          `&pagination[pageSize]=200` +
          `&sort=Data:desc`
        ).then(r => r.data.data ?? []).catch(() => []))
      }
      if (sublinkCasesIds.size > 0) {
        const idFilters = Array.from(sublinkCasesIds)
          .map(id => `filters[id][$in]=${id}`)
          .join('&')
        queries.push(axios.get(
          `${STRAPI}/api/cases?${idFilters}` +
          `&populate[cliente]=true` +
          `&populate[especialidade]=true` +
          `&populate[agencia][populate]=logo` +
          `&populate[imagem_capa]=true` +
          `&populate[blocos][populate]=*` +
          `&pagination[pageSize]=200` +
          `&sort=Data:desc`
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
        // Descobre âncora: 1ª seção que contém esse case
        let ancora = ''
        const especialidadeSlug = c.especialidade?.slug
        if (especialidadeSlug && especialidadeSlugs.has(especialidadeSlug)) {
          ancora = especialidadeSlug
        } else {
          // Procura nos sublink cases ids
          for (const secao of secoes) {
            if (secao.tipo === 'sub' && secao.caseIds?.includes(c.id)) {
              ancora = secao.slug
              break
            }
          }
        }
        entradas.push({
          id:          `${c.id}-main`,
          ancora,
          label:       c.Data ? new Date(c.Data).getFullYear() : null,
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

  // Scrolla pra entrada da âncora — funciona ao montar e em hashchange
  useEffect(() => {
    if (!entradasPre || !Object.keys(anchorMap).length) return
    const aplicar = () => {
      const hash = window.location.hash.slice(1)
      if (!hash) return
      if (hashAtivoRef.current === hash) return
      hashAtivoRef.current = hash
      const targetId = anchorMap[hash]
      if (!targetId) return
      // Pequeno delay pra timeline ter renderizado os cards
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cases-scroll-to', { detail: { entryId: targetId } }))
      }, 100)
    }
    aplicar()
    window.addEventListener('hashchange', aplicar)
    return () => window.removeEventListener('hashchange', aplicar)
  }, [entradasPre, anchorMap])

  if (entradasPre === null) {
    return <div className="cases-timeline cases-timeline--case" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
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
