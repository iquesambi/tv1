import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import Menu from '../components/Menu.jsx'
import './TrabalheComenoscoPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

export default function TrabalheComenoscoPage() {
  const [conteudo, setConteudo] = useState(undefined)
  const [vagas, setVagas] = useState([])
  const [logo, setLogo] = useState(null)
  const goTo = useGoTo()

  useEffect(() => {
    api('logo-site?populate=logo').then(setLogo)
    document.body.classList.remove('scroll-locked')
  }, [])

  useEffect(() => {
    api('trabalhe-conosco?populate=vagas')
      .then(r => {
        setConteudo(r ?? null)
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const ativas = (r?.vagas ?? []).filter(v =>
          !v.data_expiracao || new Date(v.data_expiracao) >= hoje
        )
        setVagas(ativas)
      })
  }, [])

  return (
    <div className="trabalhe-page">

      {/* Header */}
      <header className="trabalhe-header">
        <button className="trabalhe-logo" onClick={() => goTo('/')} aria-label="Home">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </button>
      </header>

      {/* Main */}
      <main className="trabalhe-main">

        {/* Título + descrição */}
        <section className="trabalhe-intro">
          <h1 className="trabalhe-intro__title">
            {conteudo?.titulo || 'Porquê trabalhar aqui?'}
          </h1>
          {conteudo?.descricao && (
            <p className="trabalhe-intro__text">{conteudo.descricao}</p>
          )}
        </section>

        {/* Oportunidades — sempre aparece */}
        <section className="trabalhe-oportunidades">
          <h2 className="trabalhe-oportunidades__title">Oportunidades</h2>

          {vagas.length === 0 ? (
            <p className="trabalhe-sem-vagas">Sem vagas no momento.</p>
          ) : (
            <div className="trabalhe-vagas">
              {vagas.map((vaga, idx) => (
                <div key={idx} className="trabalhe-vaga">
                  <div className="trabalhe-vaga__titulo">{vaga.titulo}</div>
                  <div className="trabalhe-vaga__descricao">{vaga.descricao}</div>
                  {vaga.link_aplicacao && (
                    <a
                      href={vaga.link_aplicacao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trabalhe-vaga__btn"
                    >
                      Aplicar
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <Menu />

    </div>
  )
}
