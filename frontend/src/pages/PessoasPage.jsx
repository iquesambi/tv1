import { useEffect, useState } from 'react'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import './PessoasPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

const LS_KEY = 'tv1-pessoas'

export const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export default function PessoasPage() {
  const [equipe, setEquipe] = useState(null)
  const [logo, setLogo]     = useState(null)

  const [pronto, setPronto] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]').length > 0 } catch { return false }
  })

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
      saved.forEach(url => { const img = new Image(); img.src = url })
    } catch {}
  }, [])

  useEffect(() => {
    api('pessoas?filters[ativo][$eq]=true&populate=foto&sort=ordem').then(setEquipe)
    api('logo-site?populate=logo').then(setLogo)
    document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    if (!equipe) return
    const urls = equipe.map(m => mediaUrl(m.foto)).filter(Boolean)
    try { localStorage.setItem(LS_KEY, JSON.stringify(urls)) } catch {}
    if (pronto) return
    if (!urls.length) { setPronto(true); return }
    const timeout = setTimeout(() => setPronto(true), 6000)
    let count = 0
    const done = () => { if (++count >= urls.length) { clearTimeout(timeout); setPronto(true) } }
    urls.forEach(url => { const img = new Image(); img.onload = img.onerror = done; img.src = url })
    return () => clearTimeout(timeout)
  }, [equipe])

  useEffect(() => {
    if (!equipe || !pronto) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const tentar = (n = 0) => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      else if (n < 10) setTimeout(() => tentar(n + 1), 150)
    }
    tentar()
  }, [equipe, pronto])

  if (!equipe || !pronto) return (
    <div className="pessoas-page pessoas-page--loading">
      <div className="cliente-loading">
        <div className="cliente-loading__spinner" />
      </div>
    </div>
  )

  const membros = equipe ?? []

  return (
    <div className="pessoas-page">

      <header className="pessoas-header">
        <div className="pessoas-header__logo">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </div>
        <span className="pessoas-header__titulo">Pessoas</span>
      </header>

      <main className="pessoas-main">
        {membros.map((m, i) => {
          const primeiro = membros[0]
          const foto = m.foto || primeiro?.foto
          const bio  = m.bio  || primeiro?.bio
          return (
            <section
              key={i}
              id={m.slug}
              className={`pessoa-bloco${i % 2 !== 0 ? ' pessoa-bloco--invertido' : ''}`}
            >
              {foto && (
                <div className="pessoa-foto">
                  <img src={mediaUrl(foto)} alt={m.nome} />
                </div>
              )}
              <div className="pessoa-texto">
                <h2 className="pessoa-nome">{m.nome}</h2>
                {m.cargo && <p className="pessoa-cargo">{m.cargo}</p>}
                {bio     && <p className="pessoa-bio">{bio}</p>}
              </div>
            </section>
          )
        })}
      </main>

      <Menu />

    </div>
  )
}
