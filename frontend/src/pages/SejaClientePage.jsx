import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import './OutrosAssuntosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith('http') ? obj.url : `${STRAPI}${obj.url}`

export default function SejaClientePage() {
  const [logo, setLogo] = useState(null)
  const [form, setForm] = useState({ nome: '', empresa: '', contato: '', mensagem: '' })
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const footerRef = useRef(null)

  const pronto = logo !== null

  useEffect(() => {
    api('logo-site?populate=logo').then(setLogo)
    document.body.classList.remove('scroll-locked')
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    await new Promise(r => setTimeout(r, 800))
    setEnviado(true)
    setEnviando(false)
  }

  if (!pronto) return (
    <div className="outros-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="outros-spinner" />
    </div>
  )

  return (
    <div className="outros-page">

      <header className="outros-header">
        <button className="outros-logo" onClick={() => footerRef.current?.scrollIntoView({ behavior: 'smooth' })} aria-label="Home">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </button>
      </header>

      <main className="outros-main">

        <h1 className="outros-title">Seja cliente</h1>

        <div className="outros-content">

          {enviado ? (
            <div className="outros-sucesso">
              <p>Mensagem enviada! Em breve entraremos em contato.</p>
            </div>
          ) : (
            <form className="outros-form" onSubmit={handleSubmit}>

              <div className="outros-field">
                <label className="outros-field__label">Nome</label>
                <input
                  className="outros-field__input"
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="outros-field">
                <label className="outros-field__label">Empresa</label>
                <input
                  className="outros-field__input"
                  type="text"
                  name="empresa"
                  value={form.empresa}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="outros-field">
                <label className="outros-field__label">Contato</label>
                <input
                  className="outros-field__input"
                  type="text"
                  name="contato"
                  value={form.contato}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="outros-field">
                <label className="outros-field__label">Fale com a gente</label>
                <textarea
                  className="outros-field__textarea"
                  name="mensagem"
                  value={form.mensagem}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="outros-form__footer">
                <button
                  type="submit"
                  className="outros-btn"
                  disabled={enviando}
                >
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
              </div>

            </form>
          )}
        </div>

      </main>

      <div ref={footerRef}><Menu /></div>

    </div>
  )
}
