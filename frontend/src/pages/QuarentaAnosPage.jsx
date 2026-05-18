import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import axios from 'axios'
import Menu from '../components/Menu.jsx'
import CasesTimeline from '../components/CasesTimeline.jsx'
import './QuarentaAnosPage.css'

const STRAPI = 'https://tv1-53ev.onrender.com'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => !obj?.url ? null : obj.url.startsWith("http") ? obj.url : `${STRAPI}${obj.url}`

const FOTOS_FIGMA = [
  'https://www.figma.com/api/mcp/asset/733afda4-e15a-47bf-9b8d-0813f88e200d',
  'https://www.figma.com/api/mcp/asset/98fc439c-fd5a-47c3-bf03-652b6baee46b',
  'https://www.figma.com/api/mcp/asset/89f1cd8e-8edb-4974-9840-b80c9662f75f',
  'https://www.figma.com/api/mcp/asset/00a10eeb-94dd-4f84-80f6-c646c4319ba4',
]


export default function QuarentaAnosPage() {

  const [data, setData]       = useState(null)
  const [playing, setPlaying] = useState(false)

  const videoRef      = useRef(null)
  const heroRef       = useRef(null)
  const composicaoRef = useRef(null)

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroBgY = useTransform(heroProgress, [0, 1], ['0%', '30%'])

  useEffect(() => {
    api('quarenta-anos?populate[imagem]=true&populate[video_capa]=true&populate[fotos]=true').then(setData)
    document.body.classList.remove('scroll-locked')
  }, [])

  const fotos = data?.fotos?.length
    ? data.fotos.map(f => mediaUrl(f))
    : FOTOS_FIGMA

  return (
    <div className="qa-page">

      {/* HERO */}
      <section ref={heroRef} className="qa-hero" onClick={() => data?.video_url && !playing && setPlaying(true)}>
        <motion.div className="qa-hero__bg-wrap" style={{ y: heroBgY }}>
          {playing && data?.video_url
            ? <video ref={videoRef} className="qa-hero__bg" src={data.video_url} autoPlay playsInline />
            : data?.video_capa
            ? <img className="qa-hero__bg" src={mediaUrl(data.video_capa)} alt="" />
            : null
          }
        </motion.div>
        <div className="qa-hero__overlay" />
        <div className="qa-hero__ui">
          {!playing && (
            <button className="qa-hero__play" aria-label="Assistir vídeo">
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeWidth="1.5" />
                <polygon points="26,20 26,44 46,32" fill="#fff" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* COMPOSIÇÃO */}
      <section ref={composicaoRef} className="qa-composicao">
        <div>
          <svg
            className="qa-svg"
            viewBox="-43 -220 1453 2120"
            xmlns="http://www.w3.org/2000/svg"
          >

            {/* Máquina/typewriter — alinhada à esquerda de "experiências" */}
            {fotos[3] && (
              <image href={fotos[3]} x="734" y="-120" width="120" height="75" preserveAspectRatio="xMidYMid meet" />
            )}

            {/* Texto descricao — largura de "experiências" */}
            <foreignObject x="744" y="0" width="510" height="400" className="qa-fo-lorem">
              <div xmlns="http://www.w3.org/1999/xhtml" className="qa-lorem-fo">
                <p style={{fontWeight: 700, margin: '0 0 1em'}}>Nós não apenas vivemos 40 anos de história.<br/>O que importa é como usamos esses 40 anos<br/>para construir o depois.</p>
                <p style={{margin: '0 0 1em'}}>Quatro décadas atravessando mudanças de tecnologia,<br/>mídia, comportamento e cultura nos ensinaram algo<br/>essencial: futuro não é previsão, é construção diária.<br/>Cada experiência que criamos para ajudar a transformar<br/>pessoas, marcas e negócios nos abre novos caminhos<br/>de evolução.</p>
                <p style={{margin: 0}}>Assim, nasce uma nova perspectiva: conhecimento e<br/>experiência materializados em uma plataforma que cura<br/>tendências e as aplica em cada um dos próximos desafios.</p>
              </div>
            </foreignObject>

            {/* ── FOTOS empilhadas à esquerda ── */}
            {fotos[0] && (
              <image href={fotos[0]} x="30" y="900" width="400" height="225" preserveAspectRatio="xMidYMid slice" />
            )}
            {fotos[1] && (
              <image href={fotos[1]} x="30" y="1135" width="400" height="225" preserveAspectRatio="xMidYMid slice" />
            )}
            {fotos[2] && (
              <image href={fotos[2]} x="30" y="1370" width="400" height="225" preserveAspectRatio="xMidYMid slice" />
            )}

            {/* "4" */}
            <path
              d="M570.973 752.706V874.707C570.973 886.506 561.418 896.068 549.628 896.068H385.116C373.326 896.068 363.771 886.506 363.771 874.707V774.068C363.771 762.268 354.217 752.706 342.427 752.706H-21.6556C-33.4454 752.706 -43 743.144 -43 731.345V593.709C-43 573.657 -38.2748 553.896 -29.2182 536.011L236.307 11.7063C239.944 4.52027 247.309 0 255.347 0H427.48C443.404 0 453.723 16.8177 446.52 31.0276L192.692 532.221C185.488 546.431 195.807 563.249 211.731 563.249H549.605C561.395 563.249 570.95 572.811 570.95 584.61V752.695L570.973 752.706Z"
              fill="white"
            />

            {/* "0" donut */}
            <g transform="translate(487, 691)">
              <path
                fillRule="evenodd"
                d="M788.635 789.897C699.032 878.655 589.988 923.034 461.517 923.034C333.045 923.034 223.979 878.655 134.399 789.897C44.7957 701.14 0 591.689 0 461.511C0 331.333 44.7957 221.882 134.399 133.125C223.979 44.3671 333.022 0 461.517 0C590.012 0 699.032 44.3787 788.635 133.125C878.215 221.882 923.034 331.356 923.034 461.511C923.034 591.666 878.226 701.151 788.635 789.897ZM277.045 651.704C326.492 700.734 387.99 725.243 461.528 725.243C535.067 725.243 596.554 700.734 646.001 651.704C695.448 602.697 720.177 539.296 720.177 461.523C720.177 383.75 695.459 320.371 646.001 271.341C596.554 222.334 535.055 197.802 461.528 197.802C388.002 197.802 326.492 222.334 277.045 271.341C227.598 320.371 202.868 383.773 202.868 461.523C202.868 539.272 227.586 602.697 277.045 651.704Z"
                fill="white"
              />
            </g>

            {/* ANOS DE */}
            <text fontFamily="Gilroy, sans-serif" fontWeight="900" fontStyle="normal" fontSize="108" fill="white">
              <tspan x="260" y="510">ANOS DE</tspan>
            </text>

            {/* experi ências */}
            <text fontFamily="PP Hatton, serif" fontStyle="italic" fontWeight="500" fontSize="190" fill="white" className="qa-texto-sv-experiencias">
              <tspan x="730" y="520">experi</tspan>
              <tspan x="730" y="669">ências</tspan>
            </text>

            {/* SEJAM BEM-VINDOS ao futuro */}
            <text fontFamily="Gilroy, sans-serif" fontWeight="900" fontStyle="italic" fontSize="40" fill="white" textAnchor="start">
              <tspan x="730" y="1730">SEJAM </tspan>
              <tspan x="730" y="1767">BEM-VINDOS</tspan>
            </text>
            <text fontFamily="PP Hatton, serif" fontStyle="italic" fontWeight="500" fontSize="105" fill="white" textAnchor="start">
              <tspan x="730" y="1860">ao futuro</tspan>
            </text>

          </svg>
        </div>
      </section>

      {/* TEXTO MOBILE — lorem + experiências abaixo do SVG */}
      <section className="qa-texto-mobile">
        {data?.descricao && (
          <p className="qa-texto-mobile__lorem">{data.descricao}</p>
        )}
        <div className="qa-texto-mobile__experiencias">
          <span>experi</span>
          <span>ências</span>
        </div>
        <div className="qa-texto-mobile__bv">
          <span className="qa-texto-mobile__bv-sejam">SEJAM BEM-VINDOS</span>
          <span className="qa-texto-mobile__bv-futuro">ao futuro</span>
        </div>
      </section>

      {/* CASES */}
      <CasesTimeline conteudo="quarentaAnos" contexto="pagina" tema="escuro" />

      <Menu variant="escuro" semMarcas />

    </div>
  )
}
