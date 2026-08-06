import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import MobileMenu from '../components/MobileMenu.jsx'
import '../pages/ClientePage.css'
import './CasesTimeline.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const apiGet = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

// Card da timeline mostra no máximo ~380px de largura (clamp no CSS) — pedir
// a imagem original inteira (várias vezes maior, sem redimensionar) só pra
// exibir nesse tamanho é desperdício de banda. Insere uma transformação do
// Cloudinary direto na URL (sem precisar reprocessar nada no CMS): largura
// máxima cobrindo até uma tela retina (2x), qualidade e formato automáticos.
const CAPA_LARGURA = 800
const capaUrl = (obj) => {
  const url = mediaUrl(obj)
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${CAPA_LARGURA},q_auto,f_auto/`)
}

const ALTURAS = [460, 340, 400, 310, 380]
const alturaParaIdx = (idx) => ALTURAS[idx % ALTURAS.length]

// Quando o CMS não preenche ancora_id, deriva um a partir do título — sem
// isso o bloco (subcase/vídeo) nunca ganhava uma entrada na timeline,
// mesmo com capa e tudo mais preenchido. Mesma função existe em
// CasePage.jsx pra gerar o id real do elemento — precisa bater com esta.
function slugifyAncora(texto) {
  if (!texto) return ''
  return String(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* ── monta entradas ── */
// `slug` é a especialidade da página (só usado no modo 'especialidade').
function montarEntradas(cases, tipoResolvido, slug = null) {
  const entradas = []
  // especialidade/sub viraram relações múltiplas — helpers pra normalizar.
  const subDoCase = (c) => {
    const subs = Array.isArray(c.sub_especialidade) ? c.sub_especialidade : (c.sub_especialidade ? [c.sub_especialidade] : [])
    if (tipoResolvido === 'especialidade' && slug) {
      return subs.find(s => s?.especialidade?.slug === slug) || subs[0] || null
    }
    return subs[0] || null
  }

  if (tipoResolvido === 'quarentaAnos') {
    for (const c of cases) {
      const clienteSlug = c.cliente?.slug
      const caseSlug    = c.slug
      const imgTimeline = c.imagem_timeline || c.imagem_capa
      // O label da timeline de 40 anos agora é o TEMA do case (não o ano) —
      // os cases são agrupados/ordenados por tema (ver ordem no CMS).
      const temaNome  = c.tema?.nome || ''
      const ordemTema = c.tema?.ordem ?? 9999
      if (imgTimeline) {
        entradas.push({
          id:          `${c.id}-main`,
          label:       temaNome,
          ordemTema,
          data:        c.Data ? new Date(c.Data) : new Date(0),
          nome:        c.titulo_timeline || c.titulo || '',
          capa:        imgTimeline,
          href:        clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug ?? ''}`,
          clicavel:    c.clicavel !== 'não clicável',
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
        })
      }
      for (const bloco of c.blocos ?? []) {
        const blocoCapa = bloco.imagem_timeline || bloco.imagem_capa
        const blocoData = bloco.Data || c.Data
        if (bloco.__component === 'blocks.subcase' && blocoCapa && bloco.visivel !== false) {
          const ancoraId = bloco.ancora_id || slugifyAncora(bloco.titulo_timeline || bloco.titulo)
          if (!ancoraId) continue
          entradas.push({
            id:          `${c.id}-${ancoraId}`,
            label:       temaNome,
            ordemTema,
            data:        blocoData ? new Date(blocoData) : new Date(0),
            nome:        bloco.titulo_timeline || bloco.titulo || '',
            capa:        blocoCapa,
            href:        clienteSlug && caseSlug
              ? `/${clienteSlug}/${caseSlug}#${ancoraId}`
              : `/${caseSlug ?? ''}#${ancoraId}`,
            agenciaLogo: c.agencia?.logo ?? null,
            agenciaNome: c.agencia?.nome ?? null,
          })
        }
        if (bloco.__component === 'blocks.video' && bloco.ir_para_timeline && bloco.visivel !== false) {
          const videoCapa = bloco.imagem_timeline || bloco.capa
          if (!videoCapa) continue
          const ancoraId = bloco.ancora_id || slugifyAncora(bloco.titulo)
          if (!ancoraId) continue
          entradas.push({
            id:          `${c.id}-${ancoraId}`,
            label:       temaNome,
            ordemTema,
            data:        c.Data ? new Date(c.Data) : new Date(0),
            nome:        bloco.titulo || '',
            capa:        videoCapa,
            href:        clienteSlug && caseSlug
              ? `/${clienteSlug}/${caseSlug}#${ancoraId}`
              : `/${caseSlug ?? ''}#${ancoraId}`,
            agenciaLogo: c.agencia?.logo ?? null,
            agenciaNome: c.agencia?.nome ?? null,
          })
        }
      }
    }
    // Agrupa por tema (ordem asc); dentro de cada tema, mais recente primeiro.
    return entradas.sort((a, b) => a.ordemTema - b.ordemTema || b.data - a.data)
  }

  // marca / especialidade
  for (const c of cases) {
    const clienteSlug = c.cliente?.slug
    const caseSlug    = c.slug
    const sub         = subDoCase(c)
    const ordemSub    = sub?.ordem ?? 9999
    const capaPrincipal = c.imagem_timeline || c.imagem_capa
    if (capaPrincipal) {
      entradas.push({
        id:          `${c.id}-main`,
        label:       tipoResolvido === 'marca'
          ? (c.Data ? new Date(c.Data).getFullYear() : null)
          : (sub?.nome || ''),
        data:        c.Data ? new Date(c.Data) : new Date(0),
        nome:        c.titulo_timeline || c.titulo,
        capa:        capaPrincipal,
        href:        clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug}`,
        clicavel:    c.clicavel !== 'não clicável',
        agenciaLogo: c.agencia?.logo ?? null,
        agenciaNome: c.agencia?.nome ?? null,
        ordemSub,
      })
    }
    for (const bloco of c.blocos ?? []) {
      if (bloco.__component === 'blocks.subtitulo' && bloco.timeline && bloco.timeline_data && bloco.visivel !== false) {
        const subtituloCapa = bloco.timeline_capa || c.imagem_capa
        if (!subtituloCapa) continue
        // A base do slug tem que ser o mesmo campo usado como id real do
        // elemento em CasePage.jsx (block.texto) — timeline_nome é só o
        // rótulo de exibição na timeline, não existe na página do case.
        const ancoraId = bloco.ancora_id || slugifyAncora(bloco.texto)
        entradas.push({
          id:          `${c.id}-sub-${bloco.id}`,
          label:       tipoResolvido === 'marca'
            ? new Date(bloco.timeline_data).getFullYear()
            : (sub?.nome || ''),
          data:        new Date(bloco.timeline_data),
          nome:        bloco.timeline_nome || bloco.texto,
          capa:        subtituloCapa,
          href:        clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${ancoraId}`
            : `/${caseSlug}#${ancoraId}`,
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
          ordemSub,
        })
      }
      if (bloco.__component === 'blocks.subcase' && bloco.visivel !== false) {
        const blocoCapa = bloco.imagem_timeline || bloco.imagem_capa
        if (!blocoCapa) continue
        const ancoraId = bloco.ancora_id || slugifyAncora(bloco.titulo_timeline || bloco.titulo)
        if (!ancoraId) continue
        const blocoData = bloco.Data ? new Date(bloco.Data) : (c.Data ? new Date(c.Data) : new Date(0))
        entradas.push({
          id:          `${c.id}-sub-${bloco.id}`,
          label:       tipoResolvido === 'marca'
            ? blocoData.getFullYear()
            : (sub?.nome || ''),
          data:        blocoData,
          nome:        bloco.titulo_timeline || bloco.titulo,
          capa:        blocoCapa,
          href:        clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${ancoraId}`
            : `/${caseSlug}#${ancoraId}`,
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
          ordemSub,
        })
      }
      if (bloco.__component === 'blocks.video' && bloco.ir_para_timeline && bloco.visivel !== false) {
        const videoCapa = bloco.imagem_timeline || bloco.capa
        if (!videoCapa) continue
        const ancoraId = bloco.ancora_id || slugifyAncora(bloco.titulo)
        if (!ancoraId) continue
        entradas.push({
          id:          `${c.id}-sub-${bloco.id}`,
          label:       tipoResolvido === 'marca'
            ? (c.Data ? new Date(c.Data).getFullYear() : null)
            : (sub?.nome || ''),
          data:        c.Data ? new Date(c.Data) : new Date(0),
          nome:        bloco.titulo,
          capa:        videoCapa,
          href:        clienteSlug && caseSlug
            ? `/${clienteSlug}/${caseSlug}#${ancoraId}`
            : `/${caseSlug}#${ancoraId}`,
          agenciaLogo: c.agencia?.logo ?? null,
          agenciaNome: c.agencia?.nome ?? null,
          ordemSub,
        })
      }
    }
  }
  // Para especialidade: agrupa por ordem da sub-especialidade, data desc dentro de cada grupo.
  // Para marca: ordena só por data desc.
  if (tipoResolvido === 'especialidade') {
    entradas.sort((a, b) => a.ordemSub - b.ordemSub || b.data - a.data)
  } else {
    entradas.sort((a, b) => b.data - a.data)
  }
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
function CaseCard({ entrada, idx, carousel, proporcaoNatural = false, maxImageHeight = null, navState = null, carregarImagem = true }) {
  const goTo = useGoTo()

  const cardStyle = proporcaoNatural
    ? { alignSelf: 'center', height: 'fit-content', background: 'transparent' }
    : carousel ? { height: alturaParaIdx(idx) } : undefined

  // aspectRatio reserva o espaço da imagem mesmo antes dela carregar (janela
  // de lazy loading) — sem isso o card colapsaria pra altura 0 até a hora
  // de baixar a imagem, causando pulo de layout quando ela finalmente entra
  // na janela visível.
  const { width: capaW, height: capaH } = entrada.capa ?? {}
  const imgStyle = proporcaoNatural
    ? {
        display: 'block',
        width: '100%',
        height: 'auto',
        maxHeight: maxImageHeight ? `${maxImageHeight}px` : '70vh',
        objectFit: 'fill',
        aspectRatio: capaW && capaH ? `${capaW} / ${capaH}` : undefined,
      }
    : undefined

  const clickable = entrada.clicavel !== false
  return (
    <div
      className={['cliente-card', 'cliente-card--ativo', carousel ? 'cliente-card--carousel' : '', !clickable ? 'cliente-card--sem-link' : ''].join(' ')}
      style={cardStyle}
      data-idx={idx}
      onClick={clickable ? () => goTo(entrada.href, null, navState) : undefined}
    >
      {entrada.capa && (
        <img src={carregarImagem ? capaUrl(entrada.capa) : undefined} alt={entrada.nome} className="cliente-card__img" style={imgStyle} loading="lazy" />
      )}
      <div className="cliente-card__overlay">
        <h3 className="cliente-card__titulo">{entrada.nome}</h3>
      </div>
    </div>
  )
}

/* ── Timeline bar ── */
function TimelineBar({ labels, xRef, tiltDeltaRef, timelineTrackRef, usaCarrossel, onLabelClick, arrowRef, onArrowClick, eras, erasTrackRef }) {
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
        className={`timeline timeline--carousel${eras?.length > 0 ? ' timeline--com-eras' : ''}`}
        onMouseDown={e => { isDragging.current = true; dragStart.current = e.clientX; e.preventDefault() }}
      >
        <div className="timeline__inner">
          {eras?.length > 0 && (
            <div className="timeline__eras-viewport">
              <div className="timeline__eras-track" ref={erasTrackRef}>
                {[0, 1, 2].map(setIdx => (
                  <div className="timeline__eras-set" key={setIdx}>
                    {eras.map((e, i) => (
                      <div key={i} className="timeline__era" style={{ left: `${e.pos}%` }}>{e.nome}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
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
        {/* Seta "mais à direita" — visibilidade controlada pelo tick via ref */}
        <button
          ref={arrowRef}
          className="timeline__next-arrow"
          // preventDefault no mousedown evita o foco nativo do botão — sem
          // isso, o navegador rola a página pra trazer o botão pra vista
          // (já que o layout usa transform em vez de scroll nativo, isso
          // bagunçava a posição de tudo)
          onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={e => { e.stopPropagation(); onArrowClick?.(e) }}
          style={{ opacity: 0, pointerEvents: 'none' }}
        >&gt;</button>
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
  conteudo,               // 'marca' | 'especialidade' | 'quarentaAnos' | 'unified'
  tipo,                   // retrocompat: 'cliente' | 'especialidade'
  slug,
  contexto = 'case',      // 'pagina' | 'case'
  tema     = 'claro',     // 'claro'  | 'escuro'
  proporcaoNatural = true,
  navState = null,
  entradasPre = null,     // p/ modo unified: entradas já montadas pela página
  anchorMap   = null,     // p/ modo unified: slug -> entry id (rolagem por âncora)
  initialEntryId = null,  // p/ modo unified embutido: centra neste entry ao montar
}) {
  // Resolve tipo/conteudo
  const tipoResolvido = conteudo ?? (tipo === 'cliente' ? 'marca' : (tipo ?? 'marca'))

  const goTo = useGoTo()

  const [entradas, setEntradas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [logo, setLogo]         = useState(null)

  const viewportRef      = useRef(null)
  const trackRef         = useRef(null)
  const timelineTrackRef = useRef(null)
  const erasTrackRef     = useRef(null)
  const xRef             = useRef({ x: 0 })
  const xTargetRef       = useRef(null)
  const firstSetCardsRef = useRef([])
  const oneSetRef        = useRef(0)
  const tiltDeltaRef     = useRef(0)
  const arrowRef         = useRef(null)
  const seenLabelsRef    = useRef(new Set())
  const labelsRef        = useRef([])
  const [labels, setLabels]   = useState([])
  const [vpHeight, setVpHeight] = useState(null)

  // Janela de lazy loading: só os cards visíveis + 20% de buffer pra cada
  // lado têm a imagem carregada; os demais só carregam quando entram nessa
  // janela (arrastando/scrollando). Uma vez carregado, o índice nunca sai
  // do set — evita recarregar/piscar imagem ao ir e voltar.
  const loadedIndicesRef = useRef(new Set())
  const [, setLoadedVersion] = useState(0) // só pra forçar re-render quando a janela muda

  // A faixa separada de "eras" saiu: no modo 40 anos o tema virou o próprio
  // label da régua (ver montarEntradas). Mantido vazio para o TimelineBar não
  // renderizar a régua de eras.
  const eras = []

  // Logo para contexto 'pagina' (não quarentaAnos)
  useEffect(() => {
    if (contexto === 'pagina' && tipoResolvido !== 'quarentaAnos') {
      apiGet('logo-site?populate=logo').then(setLogo)
    }
  }, [contexto, tipoResolvido])

  // Mede a altura real do viewport para limitar imagens em proporcaoNatural
  useEffect(() => {
    if (!proporcaoNatural || !viewportRef.current) return
    const el = viewportRef.current
    setVpHeight(el.clientHeight)
    const ro = new ResizeObserver(entries => {
      setVpHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proporcaoNatural, entradas.length])

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
    // Modo unified: a página já montou as entradas, só repassa.
    if (tipoResolvido === 'unified') {
      if (entradasPre) {
        setEntradas(entradasPre)
        setCarregando(false)
      }
      return
    }
    if (tipoResolvido === 'quarentaAnos') {
      apiGet(
        'cases-quarenta-anos' +
        '?populate[imagem_capa]=true' +
        '&populate[imagem_timeline]=true' +
        '&populate[cliente]=true' +
        '&populate[agencia]=true' +
        '&populate[tema]=true' +
        '&populate[blocos][populate]=*' +
        '&sort=Data:desc' +
        '&pagination[limit]=100'
      ).then(data => {
        setEntradas(montarEntradas(data ?? [], 'quarentaAnos'))
        setCarregando(false)
      })
      return
    }

    if (!slug) { setCarregando(false); return }

    const filtro = tipoResolvido === 'especialidade'
      ? `filters[especialidade][slug][$eq]=${slug}`
      : `filters[cliente][slug][$eq]=${slug}`

    axios.get(
      `${STRAPI}/api/cases?${filtro}` +
      `&populate[cliente]=true` +
      `&populate[especialidade]=true` +
      `&populate[sub_especialidade][populate][especialidade]=true` +
      `&populate[imagem_capa]=true` +
      `&populate[imagem_timeline]=true` +
      `&populate[blocos][populate]=*` +
      `&sort=Data:desc`
    )
      .then(r => {
        const novas = montarEntradas(r.data.data ?? [], tipoResolvido, slug)
        setEntradas(novas)
        const urls = novas.map(e => mediaUrl(e.capa)).filter(Boolean)
        try { localStorage.setItem(`tv1-cases-${tipoResolvido}-${slug}`, JSON.stringify(urls)) } catch {}
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [tipoResolvido, slug, entradasPre])

  // Mantém labelsRef em sincronia para o tick poder ler sem fechar sobre o state
  useEffect(() => {
    labelsRef.current = labels
    seenLabelsRef.current = new Set()
  }, [labels])

  const n            = entradas.length
  const usaCarrossel = n >= 4

  const handleNextArrow = () => {
    const container = viewportRef.current
    if (!container) return
    const fsc = firstSetCardsRef.current
    const vw = container.clientWidth
    const oneSet = oneSetRef.current
    // Acha o card mais próximo da borda direita que ainda ultrapassa o viewport.
    // Usa posição módulo (mesmo truque do tick) pra funcionar com qualquer
    // posição do carrossel infinito — sem depender de seenLabelsRef, que é
    // cumulativo e fica desatualizado quando a timeline abre centrada no meio.
    let bestIdx = -1
    let bestModLeft = Infinity
    for (let i = 0; i < fsc.length; i++) {
      const card = fsc[i]
      const modLeft  = ((card.offsetLeft + xRef.current.x) % oneSet + oneSet) % oneSet
      const modRight = modLeft + card.offsetWidth
      if (modRight > vw + 10 && modLeft < bestModLeft) {
        bestModLeft = modLeft
        bestIdx = i
      }
    }
    if (bestIdx >= 0) handleLabelClick(bestIdx)
  }

  const handleLabelClick = (cardIdx) => {
    const cards     = firstSetCardsRef.current
    const container = viewportRef.current
    if (!cards[cardIdx] || !container) return
    const cardCenter = cards[cardIdx].offsetLeft + cards[cardIdx].offsetWidth / 2
    const base    = container.clientWidth / 2 - oneSetRef.current - cardCenter
    const oneSet  = oneSetRef.current
    const cur     = xRef.current.x
    const options = [base, base + oneSet]
    xTargetRef.current = options.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a)
  }

  // Posiciona o card na borda esquerda do viewport. Usado tanto no
  // carregamento da timeline unificada sem âncora (primeiro case mais novo
  // no canto esquerdo) quanto no clique nas labels da barra de timeline.
  const handleAlignLeft = (cardIdx, instant = false) => {
    const cards     = firstSetCardsRef.current
    const container = viewportRef.current
    if (!cards[cardIdx] || !container) return
    const cardLeft = cards[cardIdx].offsetLeft
    const base    = -oneSetRef.current - cardLeft
    const oneSet  = oneSetRef.current
    const cur     = xRef.current.x
    const options = [base, base + oneSet]
    const target  = options.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a)
    if (instant) {
      // Só no carregamento da página — aplica direto, sem easing. O alvo
      // costuma estar bem longe da posição inicial (-oneSet), e o easing
      // de 10%/frame levava vários segundos pra acomodar, parecendo um
      // "scroll infinito" ao carregar a página.
      xRef.current.x = target
      xTargetRef.current = null
    } else {
      // Clique do usuário na label — mantém o scroll suave.
      xTargetRef.current = target
    }
  }

  // Modo unified: ouve eventos globais pra mover a timeline pra uma entrada
  // específica — centralizada (âncora clicada) ou alinhada à esquerda (load).
  useEffect(() => {
    if (tipoResolvido !== 'unified') return
    const idxOf = (entryId) => entradas.findIndex(en => en.id === entryId)
    const onScrollTo = (e) => {
      const idx = idxOf(e.detail?.entryId)
      if (idx >= 0) handleLabelClick(idx)
    }
    const onAlignLeft = (e) => {
      const idx = idxOf(e.detail?.entryId)
      if (idx >= 0) handleAlignLeft(idx, true) // instant — carregamento da página
    }
    window.addEventListener('cases-scroll-to', onScrollTo)
    window.addEventListener('cases-align-left', onAlignLeft)
    return () => {
      window.removeEventListener('cases-scroll-to', onScrollTo)
      window.removeEventListener('cases-align-left', onAlignLeft)
    }
  }, [tipoResolvido, entradas])

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

    // Enquanto o usuário não interage, o modo quarentaAnos reaplica a
    // centralização do primeiro card sempre que o layout for recalculado
    // (ver calcLabels) — sem isso, imagens/fontes carregando depois do
    // posicionamento inicial podiam deslocar os cards e o "1997" saía
    // do centro sem nunca ser corrigido de volta.
    let usuarioInteragiu = false

    // Drag com mouse
    let isDragging = false
    let dragStartX = 0
    let dragMoved  = false
    const onMouseDown  = (e) => { isDragging = true; dragMoved = false; dragStartX = e.clientX; usuarioInteragiu = true; container.style.cursor = 'grabbing' }
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

    // Drag com touch (mobile)
    let touchStartX = 0
    let touchStartY = 0
    let touchDir    = null // 'h' | 'v' | null
    let touchMoved  = false
    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchDir    = null
      touchMoved  = false
      usuarioInteragiu = true
    }
    const onTouchMove = (e) => {
      if (!usaCarrossel) return
      const dx = e.touches[0].clientX - touchStartX
      const dy = e.touches[0].clientY - touchStartY
      // Determina direcção na primeira vez
      if (!touchDir && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        touchDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (touchDir === 'v') return // gesto vertical → deixa a página scrollar
      if (touchDir === null) return // ainda a determinar direcção
      e.preventDefault()
      touchMoved = true
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      xRef.current.x += dx
      tiltDeltaRef.current = -dx * 4
    }
    const onTouchEnd = (e) => {
      if (touchMoved) e.stopPropagation()
      touchMoved = false
      touchDir   = null
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove',  onTouchMove,  { passive: false })
    container.addEventListener('touchend',   onTouchEnd,   { passive: true })

    const cards = Array.from(track.querySelectorAll('.cliente-card'))
    if (usaCarrossel) {
      firstSetCardsRef.current = cards.slice(0, n)
      oneSetRef.current = oneSet
      // Se recebeu um entry pra centralizar ao montar (ex: timeline embutida
      // no case), aplica o alinhamento instantâneo logo aqui, quando os
      // firstSetCards já estão disponíveis — evita a race condition com eventos.
      if (initialEntryId && initialEntryId !== '') {
        const idx = entradas.findIndex(e => e.id === initialEntryId)
        if (idx >= 0 && cards[idx]) {
          const cardCenter = cards[idx].offsetLeft + cards[idx].offsetWidth / 2
          const base = container.clientWidth / 2 - oneSet - cardCenter
          xRef.current.x = base + oneSet  // pega a cópia do meio do loop
          xTargetRef.current = null
        }
      } else if (tipoResolvido === 'quarentaAnos' && cards[0]) {
        // Sem entry pra centralizar (carregamento padrão): alinha o
        // primeiro case (o mais antigo) na borda esquerda da tela.
        xRef.current.x = -oneSet - cards[0].offsetLeft
        xTargetRef.current = null
      }
    }

    // Acha o intervalo de índices (0..n-1) atualmente visível (parcial ou
    // totalmente) no viewport, dada a posição atual do carrossel.
    const intervaloVisivel = () => {
      const fsc = firstSetCardsRef.current
      const os  = oneSetRef.current
      const vw  = container.clientWidth
      let minVis = null, maxVis = null
      fsc.forEach((card, i) => {
        const left  = ((card.offsetLeft + xRef.current.x) % os + os) % os
        const right = left + card.offsetWidth
        if (right > -1 && left < vw + 1) {
          if (minVis === null || i < minVis) minVis = i
          if (maxVis === null || i > maxVis) maxVis = i
        }
      })
      return minVis === null ? null : [minVis, maxVis]
    }

    // Lazy loading: os cards visíveis carregam a imagem na hora (nunca
    // esperam surgir na tela — funciona como uma rede de segurança pra
    // garantir que o que já está sendo mostrado nunca fique em branco).
    const marcarVisiveisComoCarregados = () => {
      if (!usaCarrossel) return
      const intervalo = intervaloVisivel()
      if (!intervalo) return
      let mudou = false
      for (let i = intervalo[0]; i <= intervalo[1]; i++) {
        if (!loadedIndicesRef.current.has(i)) { loadedIndicesRef.current.add(i); mudou = true }
      }
      if (mudou) setLoadedVersion(v => v + 1)
    }
    marcarVisiveisComoCarregados()

    // Continua carregando as próximas em segundo plano (não espera o
    // usuário arrastar até lá) — assim que as visíveis terminam, já puxa
    // pra frente e pra trás, um pouco de cada vez, até cobrir tudo. Isso
    // evita o "branco" de esperar a imagem aparecer só quando o card já
    // estava na tela.
    let backgroundTimer = null
    if (usaCarrossel && n > 0) {
      const intervaloInicial = intervaloVisivel()
      const centro = intervaloInicial ? Math.round((intervaloInicial[0] + intervaloInicial[1]) / 2) : 0
      let raio = 1
      const expandir = () => {
        let mudou = false
        const de  = Math.max(0, centro - raio)
        const ate = Math.min(n - 1, centro + raio)
        for (let i = de; i <= ate; i++) {
          if (!loadedIndicesRef.current.has(i)) { loadedIndicesRef.current.add(i); mudou = true }
        }
        if (mudou) setLoadedVersion(v => v + 1)
        raio += 2
        if (de > 0 || ate < n - 1) backgroundTimer = setTimeout(expandir, 120)
      }
      backgroundTimer = setTimeout(expandir, 120)
    }

    const calcLabels = () => {
      if (usaCarrossel && timelineTrackRef.current) {
        // Recalcula oneSet do estado atual do DOM — pode ter mudado depois que
        // imagens/fontes carregaram. Sem isso, posicionamento usa valor antigo
        // e os labels viram um amontoado em cima do "1997".
        const currentOneSet = track.scrollWidth / 3
        oneSetRef.current = currentOneSet
        const sets = timelineTrackRef.current.querySelectorAll('.timeline__labels-set')
        sets.forEach(s => { s.style.width = `${currentOneSet}px` })
        if (erasTrackRef.current) {
          const erasSets = erasTrackRef.current.querySelectorAll('.timeline__eras-set')
          erasSets.forEach(s => { s.style.width = `${currentOneSet}px` })
        }
        const firstSetCards = cards.slice(0, n)

        // Reaplica o alinhamento à esquerda do primeiro card (quarentaAnos,
        // sem interação do usuário ainda) usando as medidas atuais — o
        // layout pode ter mudado desde o posicionamento inicial
        // (imagens/fontes carregando), deixando o "1997" deslocado sem correção.
        if (tipoResolvido === 'quarentaAnos' && !initialEntryId && !usuarioInteragiu && firstSetCards[0]) {
          xRef.current.x = -currentOneSet - firstSetCards[0].offsetLeft
          xTargetRef.current = null
        }

        const grupos = gruposDeLabels(entradas)
        // .timeline__labels-track começa mais pra direita que .cliente-track
        // (padding-left do .timeline__labels-viewport, que os cards não têm)
        // — sem compensar isso, os labels ficam sempre alguns px à direita
        // do card que deveriam centralizar. Os dois rects já refletem o
        // transform atual, então a diferença cancela o scroll e sobra só o
        // offset estrutural.
        const offsetPx = timelineTrackRef.current.getBoundingClientRect().left - track.getBoundingClientRect().left
        setLabels(grupos.map(g => {
          const card   = firstSetCards[g.indices[0]]
          const center = card ? card.offsetLeft + card.offsetWidth / 2 : 0
          return { label: g.label, pos: ((center - offsetPx) / currentOneSet) * 100, cardIdx: g.indices[0] }
        }))
      } else if (!usaCarrossel) {
        const grupos = gruposDeLabels(entradas)
        const timelineInner = container.closest('.cases-timeline')?.querySelector('.timeline__inner')
        const innerRect = timelineInner?.getBoundingClientRect()
        const allCards  = Array.from(container.querySelectorAll('.cliente-card'))
        setLabels(grupos.map(g => {
          const card = allCards[g.indices[0]]
          if (card && innerRect) {
            const cardRect = card.getBoundingClientRect()
            const center   = cardRect.left + cardRect.width / 2 - innerRect.left
            return { label: g.label, pos: Math.max(0, Math.min(100, (center / innerRect.width) * 100)) }
          }
          return { label: g.label, pos: ((g.indices[0] + 0.5) / n) * 100 }
        }))
      }
    }

    // Calcula agora e recalcula quando as imagens terminarem de carregar
    // (as imagens mudam as dimensões dos cards e deslocam os labels)
    calcLabels()
    const imgs = Array.from(track.querySelectorAll('img'))
    let loaded = 0
    const onImgLoad = () => { if (++loaded >= imgs.length) calcLabels() }
    imgs.forEach(img => {
      if (img.complete) { loaded++; if (loaded >= imgs.length) calcLabels() }
      else { img.addEventListener('load', onImgLoad, { once: true }); img.addEventListener('error', onImgLoad, { once: true }) }
    })

    // Refaz depois que as fontes terminam de carregar (a largura dos cards
    // muda quando a fonte custom substitui a fallback, e isso desloca os labels)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => calcLabels())
    }

    // Refaz se o track mudar de tamanho por qualquer outro motivo (resize,
    // lazy-load de imagem solta, etc) — RAF amortiza disparos consecutivos
    let resizeRaf = 0
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(calcLabels)
    })
    resizeObserver.observe(track)

    const onWheel = (e) => {
      if (!usaCarrossel) return
      if (contexto === 'pagina' && tipoResolvido !== 'quarentaAnos') {
        // Página 100vh (cases): scroll vertical E horizontal movem a timeline
        e.preventDefault()
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        xRef.current.x -= delta
        tiltDeltaRef.current = -delta * 4
        usuarioInteragiu = true
      } else {
        // quarentaAnos ou embutido: só scroll horizontal move a timeline
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault()
          xRef.current.x -= e.deltaX
          tiltDeltaRef.current = -e.deltaX * 4
          usuarioInteragiu = true
        }
      }
    }

    let frameCount = 0
    const tick = () => {
      // A cada ~12 frames (uns 200ms) — não precisa checar toda hora,
      // arrastar/animar não move o suficiente pra mudar a janela frame a frame.
      if (++frameCount % 12 === 0) marcarVisiveisComoCarregados()
      if (xTargetRef.current !== null) {
        const diff = xTargetRef.current - xRef.current.x
        if (Math.abs(diff) < 1) { xRef.current.x = xTargetRef.current; xTargetRef.current = null }
        else {
          const move = diff * 0.1
          xRef.current.x += move
          // Clamp pro tilt animado não acumular em cliques rápidos
          tiltDeltaRef.current = Math.max(-30, Math.min(30, -move * 4))
        }
      }
      const targetTilt = Math.max(-60, Math.min(60, tiltDeltaRef.current * 0.55))
      tilt += (targetTilt - tilt) * 0.08
      tiltDeltaRef.current *= 0.91
      if (usaCarrossel) {
        const os = oneSetRef.current
        if (xRef.current.x < -2 * os) xRef.current.x += os
        if (xRef.current.x > 0)       xRef.current.x -= os
        track.style.transform = `translateX(${xRef.current.x}px)`
        if (timelineTrackRef.current) timelineTrackRef.current.style.transform = `translateX(${xRef.current.x}px)`
        if (erasTrackRef.current) erasTrackRef.current.style.transform = `translateX(${xRef.current.x}px)`
      }
      const vw = container.clientWidth
      cards.forEach(card => {
        card.style.transform = `perspective(700px) rotateY(${tilt}deg)`
        // Marca cards 100% visíveis no viewport
        const left  = card.offsetLeft + xRef.current.x
        const right = left + card.offsetWidth
        const visivel = left >= -1 && right <= vw + 1
        card.classList.toggle('cliente-card--visivel', visivel)
      })

      // Seta ›: rastreia CARDS (não labels) — assim funciona mesmo com 1 único label.
      // Mostra quando algum card transborda o viewport à direita e ainda não todos foram vistos.
      if (arrowRef.current && usaCarrossel) {
        const fsc    = firstSetCardsRef.current
        const oneSet = oneSetRef.current
        let hasRight = false
        fsc.forEach((card, idx) => {
          // Normaliza (mod oneSet) pra achar a cópia certa do card num
          // carrossel em loop infinito — "+oneSet" cru só valia perto da
          // posição inicial de x.
          const left  = ((card.offsetLeft + xRef.current.x) % oneSet + oneSet) % oneSet
          const right = left + card.offsetWidth
          if (left >= -1 && right <= vw + 1) seenLabelsRef.current.add(idx)
          if (right > vw + 10) hasRight = true
        })
        const allSeen = seenLabelsRef.current.size >= fsc.length
        const show = hasRight && !allSeen
        arrowRef.current.style.opacity       = show ? '1' : '0'
        arrowRef.current.style.pointerEvents = show ? 'auto' : 'none'
      }
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
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove',  onTouchMove)
      container.removeEventListener('touchend',   onTouchEnd)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      resizeObserver.disconnect()
      clearTimeout(backgroundTimer)
    }
  }, [n, usaCarrossel, contexto, initialEntryId])

  if (carregando) return (
    <div className="cases-timeline cases-timeline--case" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="cliente-loading__spinner" />
    </div>
  )
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
            <span className="cases-timeline__titulo-case">Do www ao</span>
            <span className="cases-timeline__titulo-historicos">Prompt com a IA</span>
          </h2>
        </div>
      )}
      {contexto === 'pagina' && tipoResolvido !== 'quarentaAnos' && (
        <div className="cases-timeline__header cases-timeline__header--pagina">
          {logo?.logo && (
            <button
              onClick={() => goTo('/')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={mediaUrl(logo.logo)}
                alt="TV1"
                className="cases-timeline__logo"
              />
            </button>
          )}
          <MobileMenu logo={logo?.logo} logoFiltro="brightness(0)" />
        </div>
      )}

      {/* ── Cards ── */}
      {usaCarrossel ? (
        <div className="cliente-viewport" ref={viewportRef}>
          <div className="cliente-track" ref={trackRef}>
            {triplicadas.map(e => <CaseCard key={e._key} entrada={e} idx={e._idx} carousel proporcaoNatural={proporcaoNatural} maxImageHeight={vpHeight} navState={navState} carregarImagem={loadedIndicesRef.current.has(e._idx)} />)}
          </div>
        </div>
      ) : (
        <div className={`cliente-static cliente-static--${n}`} ref={viewportRef}>
          {triplicadas.map(e => <CaseCard key={e._key} entrada={e} idx={e._idx} carousel={false} proporcaoNatural={proporcaoNatural} maxImageHeight={vpHeight} navState={navState} />)}
        </div>
      )}

      {/* ── Timeline bar ── */}
      <TimelineBar
        labels={labels}
        xRef={xRef}
        tiltDeltaRef={tiltDeltaRef}
        timelineTrackRef={timelineTrackRef}
        usaCarrossel={usaCarrossel}
        onLabelClick={handleAlignLeft}
        arrowRef={arrowRef}
        onArrowClick={handleNextArrow}
        eras={eras}
        erasTrackRef={erasTrackRef}
      />

    </div>
  )
}
