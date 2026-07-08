import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import { fetchMenuData } from '../components/Menu.jsx'
import PageHeader from '../components/PageHeader.jsx'
import './ClientesGridPage.css'

const BASE_ITEM_H = 72
const BASE_ROW_GAP = 56
const MIN_SCALE = 0.45

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith('http') ? obj.url : `${STRAPI}${obj.url}`

// Logo nunca aparece com mais de ~156px na tela, mas muitos vêm em
// resolução original de vários milhares de px (alguns com quase 200KB) —
// pede uma versão redimensionada e com formato/qualidade automáticos
// (webp/avif quando o navegador suporta) direto na URL do Cloudinary.
const LOGO_LARGURA = 320
const logoUrl = (obj) => {
  const url = mediaUrl(obj)
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${LOGO_LARGURA},q_auto,f_auto/`)
}

// Cache em memória + dedupe da lista de clientes — sem isso, o StrictMode
// do React (dev) dispara o efeito duas vezes e cada uma refaz a mesma
// busca; revisitar /clientes na mesma sessão também refazia do zero. A
// busca em si já vem pronta e cacheada do servidor (ver
// backend/src/clientes-grid-cache.ts).
let _clientesCache   = null
let _clientesPromise = null
function fetchClientesGrid() {
  if (_clientesCache) return Promise.resolve(_clientesCache)
  if (_clientesPromise) return _clientesPromise
  _clientesPromise = api('clientes-grid')
    .then(data => { _clientesCache = data; return data })
    .catch(() => { _clientesPromise = null; return null })
  return _clientesPromise
}

const LOGO_MAX_W = 156

function logoImgStyle(logo, escala = 1) {
  const aspect = (logo?.width && logo?.height) ? logo.width / logo.height : 1.8
  const scale  = Math.max(0.3, Math.min(3, escala || 1))
  if (aspect < 1) {
    const targetW = Math.round(75 * scale)
    const h = Math.min(Math.round(88 * scale), Math.round(targetW / aspect))
    return { height: h, width: targetW }
  }
  const t = Math.min(Math.max(aspect - 1, 0) / 2.5, 1)
  let h = Math.max(Math.round((44 - t * 10) * scale), aspect > 2.8 ? 26 : 21)
  let w = Math.round(h * aspect)
  if (w > LOGO_MAX_W) { w = LOGO_MAX_W; h = Math.round(w / aspect) }
  return { height: h, width: w }
}

export default function ClientesGridPage() {
  const [clientes, setClientes] = useState(null)
  const [logo, setLogo]         = useState(null)
  const [vh, setVh]             = useState(() => window.innerHeight)
  const headerRef = useRef(null)
  const [headerH, setHeaderH] = useState(0)
  const goTo = useGoTo()

  useEffect(() => {
    fetchClientesGrid().then(setClientes)
    // Reaproveita o cache do Menu.jsx em vez de refazer o fetch do logo do site.
    fetchMenuData().then(d => { if (d) setLogo(d.logo) })
    document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (headerRef.current) setHeaderH(headerRef.current.getBoundingClientRect().height)
  }, [clientes, vh])

  if (!clientes) return (
    <div className="clientes-grid-page clientes-grid-page--loading">
      <div className="cliente-loading">
        <div className="cliente-loading__spinner" />
      </div>
    </div>
  )

  const n = clientes.length
  const numRows = Math.max(1, Math.ceil(n / 7))
  const base    = Math.floor(n / numRows)
  const extra   = n % numRows
  const rows    = []
  let idx = 0
  for (let r = 0; r < numRows; r++) {
    const size = r < extra ? base + 1 : base
    rows.push(clientes.slice(idx, idx + size))
    idx += size
  }

  // Reduz o tamanho dos logos/espaçamento entre linhas pra caber tudo na
  // tela sem scroll, quando o número de linhas exige mais altura que a
  // disponível (header + paddings descontados).
  const disponivel  = Math.max(0, vh - headerH - 48)
  const alturaNatural = numRows * BASE_ITEM_H + (numRows - 1) * BASE_ROW_GAP
  const escalaLinha = headerH ? Math.max(MIN_SCALE, Math.min(1, disponivel / alturaNatural)) : 1
  const itemH  = Math.round(BASE_ITEM_H * escalaLinha)
  const rowGap = Math.round(BASE_ROW_GAP * escalaLinha)

  return (
    <div className="clientes-grid-page">
      <div ref={headerRef}>
        <PageHeader
          logoUrl={mediaUrl(logo?.logo)}
          onLogoClick={() => goTo('/')}
          mobileMenuLogo={logo?.logo}
        />
      </div>

      <main className="clientes-grid-main" style={{ '--row-gap': `${rowGap}px`, '--item-h': `${itemH}px` }}>
        {rows.map((row, r) => (
          <div key={r} className="clientes-grid-row">
            {row.map((c, j) => {
              const temCase = c.cases?.length > 0
              const inner = c.logo
                ? <img
                    src={logoUrl(c.logo)}
                    alt={c.nome}
                    style={{ ...logoImgStyle(c.logo, (c.escala_logo || 1) * 1.2 * escalaLinha), '--logo-escala-mobile': c.escala_logo_mobile || 1 }}
                  />
                : <span className="clientes-grid-fallback">{c.nome}</span>
              return temCase ? (
                <a key={j} href={`/${c.slug}`} className="clientes-grid-item" onClick={e => { e.preventDefault(); goTo(`/${c.slug}`) }}>
                  {inner}
                </a>
              ) : (
                <div key={j} className="clientes-grid-item clientes-grid-item--sem-case">
                  {inner}
                </div>
              )
            })}
          </div>
        ))}
      </main>

    </div>
  )
}
