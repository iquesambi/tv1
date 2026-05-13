/**
 * scripts/prefetch.js
 *
 * Roda após `vite build`.
 * Busca os dados da home no Strapi e injeta em dist/index.html:
 *   - window.__TV1_DATA__  → React usa como estado inicial (zero waterfall)
 *   - <link rel="preload"> → imagens críticas carregam em paralelo com o JS
 *   - <link rel="preconnect"> → TCP/TLS pro Strapi já aquece antes do JS
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const STRAPI = 'https://tv1-53ev.onrender.com'

async function get(path) {
  try {
    const res = await fetch(`${STRAPI}/api/${path}`, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) { console.warn(`  ⚠  ${path} → HTTP ${res.status}`); return null }
    return (await res.json()).data ?? null
  } catch (err) {
    console.warn(`  ⚠  ${path} → ${err.message}`)
    return null
  }
}

async function main() {
  console.log('\n⏳  Prefetching Strapi data...')

  const [nav, logo, agencias, quarentaAnos, redes] = await Promise.all([
    get('navigation?populate[links][populate][0]=imagem_hover&populate[links][populate][sublinks][populate]=imagem_hover'),
    get('logo-site?populate=logo'),
    get('agencias?populate=logo&sort=ordem:asc'),
    get('quarenta-anos?populate=imagem'),
    get('redes-sociais?populate[redes][populate]=icone'),
  ])

  const data = { nav, logo, agencias, quarentaAnos, redes, ts: Date.now() }

  // ── Coleta URLs de imagens críticas ──────────────────────────────
  const imageUrls = new Set()
  const add = (obj) => obj?.url && imageUrls.add(`${STRAPI}${obj.url}`)

  add(logo?.logo)
  add(quarentaAnos?.imagem)
  for (const ag of agencias ?? []) add(ag.logo)
  for (const r of redes?.redes ?? []) add(r.icone)
  for (const link of nav?.links ?? []) {
    add(link.imagem_hover)
    for (const sub of link.sublinks ?? []) add(sub.imagem_hover)
  }

  // ── Monta as tags a injetar ───────────────────────────────────────
  const lines = [
    `  <link rel="preconnect" href="${STRAPI}" crossorigin>`,
    `  <link rel="dns-prefetch" href="${STRAPI}">`,
    ...[...imageUrls].map(url => `  <link rel="preload" as="image" href="${url}">`),
    `  <script>window.__TV1_DATA__=${JSON.stringify(data)};</script>`,
  ]

  // ── Injeta antes de </head> ───────────────────────────────────────
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const indexPath = join(__dirname, '../dist/index.html')
  let html = readFileSync(indexPath, 'utf-8')
  html = html.replace('</head>', `${lines.join('\n')}\n</head>`)
  writeFileSync(indexPath, html)

  console.log(`✅  Injetado: ${imageUrls.size} preloads de imagem + dados da home\n`)
}

main().catch(err => {
  console.warn('\n⚠️  Prefetch falhou — build continua sem dados injetados:', err.message, '\n')
})
