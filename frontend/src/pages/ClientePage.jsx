import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CasesTimeline from '../components/CasesTimeline.jsx'

export default function ClientePage() {
  const params = useParams()
  const clienteSlug = params.cliente ?? params.slug

  useEffect(() => {
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  return (
    <CasesTimeline
      conteudo="marca"
      slug={clienteSlug}
      contexto="pagina"
      tema="claro"
      navState={{ from: 'cliente', slug: clienteSlug }}
    />
  )
}
