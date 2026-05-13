import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import ClientePage from './ClientePage'
import EspecialidadePage from './EspecialidadePage'
import CasePage from './CasePage'

const STRAPI = 'https://tv1-53ev.onrender.com'

export default function SlugRouter() {
  const { slug } = useParams()
  const [tipo, setTipo] = useState(null)

  useEffect(() => {
    // Verifica em paralelo: especialidade, cliente e case sem cliente
    Promise.all([
      axios.get(`${STRAPI}/api/especialidades?filters[slug][$eq]=${slug}&fields=slug`).catch(() => null),
      axios.get(`${STRAPI}/api/clientes?filters[slug][$eq]=${slug}&fields=slug`).catch(() => null),
      axios.get(`${STRAPI}/api/cases?filters[slug][$eq]=${slug}&filters[cliente][id][$null]=true&fields=slug`).catch(() => null),
    ]).then(([espRes, cliRes, caseRes]) => {
      if (espRes?.data?.data?.length > 0)  return setTipo('especialidade')
      if (cliRes?.data?.data?.length > 0)  return setTipo('cliente')
      if (caseRes?.data?.data?.length > 0) return setTipo('case')
      setTipo('cliente') // fallback
    })
  }, [slug])

  if (tipo === null) return null
  if (tipo === 'especialidade') return <EspecialidadePage />
  if (tipo === 'case') return <CasePage />
  return <ClientePage />
}
