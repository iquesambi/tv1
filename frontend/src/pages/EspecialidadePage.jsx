import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import CasesTimeline from '../components/CasesTimeline.jsx'

export default function EspecialidadePage() {
  const params = useParams()
  const especialidadeSlug = params.especialidade ?? params.slug

  useEffect(() => {
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  return (
    <CasesTimeline
      conteudo="especialidade"
      slug={especialidadeSlug}
      contexto="pagina"
      tema="claro"
      navState={{ from: 'especialidade', slug: especialidadeSlug }}
    />
  )
}
