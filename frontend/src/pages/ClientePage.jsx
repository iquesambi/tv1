import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import CasesTimeline from '../components/CasesTimeline.jsx'

const STRAPI = 'https://tv1-53ev.onrender.com'

export default function ClientePage() {
  const params = useParams()
  const clienteSlug = params.cliente ?? params.slug
  const navigate = useNavigate()
  // null = checando; false = segue pra timeline; true = já mandou redirecionar
  const [redirecionando, setRedirecionando] = useState(null)

  useEffect(() => {
    document.body.classList.add('scroll-locked')
    return () => document.body.classList.remove('scroll-locked')
  }, [])

  // Cliente com um único case: pula a timeline e vai direto pro case —
  // não faz sentido mostrar uma timeline de 1 item só.
  useEffect(() => {
    let cancelado = false
    setRedirecionando(null)
    axios.get(
      `${STRAPI}/api/cases?filters[cliente][slug][$eq]=${clienteSlug}` +
      `&fields[0]=slug&pagination[pageSize]=2`
    ).then(r => {
      if (cancelado) return
      const cases = r.data?.data ?? []
      if (cases.length === 1) {
        navigate(`/${clienteSlug}/${cases[0].slug}`, { replace: true })
        setRedirecionando(true)
      } else {
        setRedirecionando(false)
      }
    }).catch(() => { if (!cancelado) setRedirecionando(false) })
    return () => { cancelado = true }
  }, [clienteSlug, navigate])

  if (redirecionando !== false) return null

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
