import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import './TrabalheFormularioPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith('http') ? obj.url : `${STRAPI}${obj.url}`

export default function TrabalheFormularioPage() {
  const [logo, setLogo] = useState(null)
  const [form, setForm] = useState({
    nome: '',
    cargo: '',
    area: '',
    email: '',
    telefone: '',
    cidade: '',
    empresa: '',
    pretensao: '',
    curriculo: null,
    portfolio_link: '',
    linkedin: '',
  })
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileInputRef = useRef(null)
  const footerRef = useRef(null)

  useEffect(() => {
    api('logo-site?populate=logo').then(setLogo)
    document.body.classList.remove('scroll-locked')
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFile = (file) => {
    if (!file) return
    setForm(prev => ({ ...prev, curriculo: file }))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      let curriculo_base64 = null
      let curriculo_nome = null
      if (form.curriculo) {
        curriculo_base64 = await toBase64(form.curriculo)
        curriculo_nome = form.curriculo.name
      }
      await axios.post(`${STRAPI}/api/contato`, {
        tipo: 'trabalhe-conosco',
        nome: form.nome,
        cargo: form.cargo,
        area: form.area,
        email: form.email,
        telefone: form.telefone,
        cidade: form.cidade,
        empresa: form.empresa,
        pretensao: form.pretensao,
        portfolio_link: form.portfolio_link,
        linkedin: form.linkedin,
        curriculo_base64,
        curriculo_nome,
      })
      setEnviado(true)
    } catch {
      alert('Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (!logo) return (
    <div className="tform-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="tform-spinner" />
    </div>
  )

  return (
    <div className="tform-page">

      <header className="tform-header">
        <button className="tform-logo" onClick={() => footerRef.current?.scrollIntoView({ behavior: 'smooth' })} aria-label="Home">
          {logo?.logo && <img src={mediaUrl(logo.logo)} alt="TV1" />}
        </button>
      </header>

      <main className="tform-main">
        <h1 className="tform-title">Quero ser um TVÚnico!</h1>

        <div className="tform-content">
          {enviado ? (
            <div className="tform-sucesso">
              <p>Candidatura enviada! Em breve entraremos em contato.</p>
            </div>
          ) : (
            <form className="tform-form" onSubmit={handleSubmit}>

              <div className="tform-field">
                <label className="tform-field__label">Nome <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="text" name="nome" value={form.nome} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Interesse em qual posição (Cargo) <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="text" name="cargo" value={form.cargo} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Em qual área já atuou? <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="text" name="area" value={form.area} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Email <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Telefone <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="tel" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(00) 00000-0000" required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Cidade <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="text" name="cidade" value={form.cidade} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Nome da última/atual empresa <span className="tform-required">*</span></label>
                <input className="tform-field__input" type="text" name="empresa" value={form.empresa} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Pretensão salarial <span className="tform-required">*</span></label>
                <span className="tform-field__hint">Preencher o valor cheio "0000"</span>
                <input className="tform-field__input" type="text" name="pretensao" value={form.pretensao} onChange={handleChange} required />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Anexe seu currículo ou portifólio <span className="tform-required">*</span></label>
                <span className="tform-field__hint">Adicione o currículo em formato de PDF</span>
                <div
                  className={`tform-upload${drag ? ' tform-upload--drag' : ''}${form.curriculo ? ' tform-upload--filled' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files[0])}
                    required={!form.curriculo}
                  />
                  {form.curriculo ? (
                    <span className="tform-upload__name">{form.curriculo.name}</span>
                  ) : (
                    <>
                      <svg className="tform-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="tform-upload__text">
                        <span className="tform-upload__link">Escolha um arquivo para enviar</span> ou arraste e solte aqui
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="tform-field">
                <label className="tform-field__label">Portifólio [Link]</label>
                <input className="tform-field__input" type="url" name="portfolio_link" value={form.portfolio_link} onChange={handleChange} />
              </div>

              <div className="tform-field">
                <label className="tform-field__label">LinkedIn [Link]</label>
                <input className="tform-field__input" type="url" name="linkedin" value={form.linkedin} onChange={handleChange} />
              </div>

              <div className="tform-form__footer">
                <button type="submit" className="tform-btn" disabled={enviando}>
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
