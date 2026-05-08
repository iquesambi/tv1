import { useState, useEffect } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import FooterBranco from '../components/FooterBranco.jsx'
import './OutrosAssuntosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

export default function OutrosAssuntosPage() {
  const [logo, setLogo] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', assunto: '', mensagem: '' })
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const goTo = useGoTo()

  useEffect(() => {
    api('logo-site?populate=logo').then(setLogo)
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    // Aqui você pode integrar com um serviço de e-mail (ex: nodemailer via Strapi, EmailJS, etc.)
    // Por ora, simula o envio
    await new Promise(r => setTimeout(r, 800))
    setEnviado(true)
    setEnviando(false)
  }

  return (
    <div className="outros-page">

      {/* Header */}
      <header className="outros-header">
        <button className="outros-logo" onClick={() => goTo('/')} aria-label="Home">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </button>
      </header>

      {/* Main */}
      <main className="outros-main">

        <h1 className="outros-title">Outros assuntos</h1>

        <div className="outros-content">
          <p className="outros-desc">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eget dui nisi.
            Donec molestie convallis sodales. Praesent lobortis hendrerit sem eget.
          </p>

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
                <label className="outros-field__label">E-mail</label>
                <input
                  className="outros-field__input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="outros-field">
                <label className="outros-field__label">Assunto</label>
                <input
                  className="outros-field__input"
                  type="text"
                  name="assunto"
                  value={form.assunto}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="outros-field">
                <label className="outros-field__label">Mensagem</label>
                <textarea
                  className="outros-field__textarea"
                  name="mensagem"
                  value={form.mensagem}
                  onChange={handleChange}
                  placeholder="Digite aqui"
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

      <FooterBranco />

    </div>
  )
}
