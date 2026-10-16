import { useEffect, useState } from 'react'
import axios from 'axios'

const STRAPI = 'https://tv1-53ev.onrender.com'

// Título e mensagem de sucesso das páginas de contato vêm do Strapi
// ("Textos dos Formulários"). Campo vazio lá — ou o Strapi fora do ar —
// cai nestes valores, então a página nunca fica sem texto.
const PADRAO = {
  seja_cliente: {
    titulo: 'Seja cliente',
    mensagem_sucesso: 'Mensagem enviada! Em breve entraremos em contato.',
  },
  outros_assuntos: {
    titulo: 'Outros assuntos',
    mensagem_sucesso: 'Mensagem enviada! Em breve entraremos em contato.',
  },
  trabalhe_conosco: {
    titulo: 'Quero ser um TVÚnico!',
    mensagem_sucesso: 'Candidatura enviada! Em breve entraremos em contato.',
  },
}

// Uma busca só, compartilhada entre as três páginas.
let requisicao = null
const buscarTextos = () => {
  requisicao ??= axios
    .get(`${STRAPI}/api/textos-formularios?populate=*`)
    .then(r => r.data.data || {})
    .catch(() => {
      requisicao = null
      return {}
    })
  return requisicao
}

const mesclar = (pagina, doCms) => {
  const textos = { ...PADRAO[pagina] }
  for (const chave of Object.keys(textos)) {
    const valor = doCms?.[chave]
    if (typeof valor === 'string' && valor.trim()) textos[chave] = valor
  }
  return textos
}

// Devolve null enquanto carrega e depois os textos da página
// ('seja_cliente' | 'outros_assuntos' | 'trabalhe_conosco').
export function useTextosFormulario(pagina) {
  const [textos, setTextos] = useState(null)
  useEffect(() => {
    let ativo = true
    buscarTextos().then(dados => { if (ativo) setTextos(mesclar(pagina, dados[pagina])) })
    return () => { ativo = false }
  }, [pagina])
  return textos
}
