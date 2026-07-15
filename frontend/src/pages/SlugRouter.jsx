import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import ClientePage from './ClientePage'
import EspecialidadePage from './EspecialidadePage'
import CasePage from './CasePage'

const STRAPI = 'https://tv1-53ev.onrender.com'

export default function SlugRouter() {
  const { slug } = useParams()
  const location = useLocation()
  // Link de preview do Strapi: o conteúdo pode ser um rascunho ainda não
  // publicado, então a detecção normal (que só busca publicados) nunca ia
  // achar o case e caía no fallback ClientePage, travando o preview.
  const emPreview = new URLSearchParams(location.search).has('documentId')
  const [tipo, setTipo] = useState(emPreview ? 'case' : null)

  useEffect(() => {
    if (emPreview) return
    // Verifica em paralelo: especialidade, cliente, case sem cliente e case 40 anos sem cliente
    Promise.all([
      axios.get(`${STRAPI}/api/especialidades?filters[slug][$eq]=${slug}&fields=slug`).catch(() => null),
      axios.get(`${STRAPI}/api/clientes?filters[slug][$eq]=${slug}&fields=slug`).catch(() => null),
      axios.get(`${STRAPI}/api/cases?filters[slug][$eq]=${slug}&filters[cliente][id][$null]=true&fields=slug`).catch(() => null),
      axios.get(`${STRAPI}/api/cases-quarenta-anos?filters[slug][$eq]=${slug}&filters[cliente][id][$null]=true&fields=slug`).catch(() => null),
    ]).then(([espRes, cliRes, caseRes, case40Res]) => {
      if (espRes?.data?.data?.length > 0)   return setTipo('especialidade')
      if (cliRes?.data?.data?.length > 0)   return setTipo('cliente')
      if (caseRes?.data?.data?.length > 0)  return setTipo('case')
      if (case40Res?.data?.data?.length > 0) return setTipo('case')
      setTipo('cliente') // fallback
    })
  }, [slug])

  if (tipo === null) return null
  if (tipo === 'especialidade') return <EspecialidadePage />
  if (tipo === 'case') return <CasePage />
  return <ClientePage />
}
