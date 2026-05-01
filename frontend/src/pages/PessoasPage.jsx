import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import './PessoasPage.css'

const STRAPI = 'http://localhost:1337'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

export const slugify = (str) => str.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export default function PessoasPage() {
  const [equipe, setEquipe] = useState(null)
  const [logo, setLogo]     = useState(null)
  const goTo = useGoTo()

  useEffect(() => {
    api('equipe?populate[membros][populate]=foto').then(setEquipe)
    api('logo-site?populate=logo').then(setLogo)
  }, [])

  const membros = equipe?.membros ?? []

  // âncora via hash após carregar
  useEffect(() => {
    if (!equipe) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const tentar = (n = 0) => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else if (n < 10) setTimeout(() => tentar(n + 1), 150)
    }
    tentar()
  }, [equipe])

  return (
    <div className="pessoas-page">

      <header className="pessoas-header" onClick={() => goTo('/')}>
        <div className="pessoas-header__logo">
          {logo?.logo
            ? <img src={mediaUrl(logo.logo)} alt="TV1" />
            : <span>TV1</span>}
        </div>
      </header>

      <main className="pessoas-main">
        {equipe === null && (
          <div className="pessoas-loading">Carregando…</div>
        )}

        {membros.map((m, i) => (
          <section
            key={i}
            id={slugify(m.nome)}
            className="pessoa-bloco"
          >
            {m.foto && (
              <div className="pessoa-foto">
                <img src={mediaUrl(m.foto)} alt={m.nome} />
              </div>
            )}

            <div className="pessoa-texto">
              <h2 className="pessoa-nome">{m.nome}</h2>
              {m.cargo && <p className="pessoa-cargo">{m.cargo}</p>}
              {m.bio   && <p className="pessoa-bio">{m.bio}</p>}
            </div>
          </section>
        ))}
      </main>

    </div>
  )
}
