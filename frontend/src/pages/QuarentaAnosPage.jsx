import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGoTo } from '../transition.jsx'
import './QuarentaAnosPage.css'

const STRAPI = 'http://localhost:1337'
const api = (path) => axios.get(`${STRAPI}/api/${path}`).then(r => r.data.data).catch(() => null)
const mediaUrl = (obj) => obj?.url ? `${STRAPI}${obj.url}` : null

const FOTOS_FIGMA = [
  'https://www.figma.com/api/mcp/asset/733afda4-e15a-47bf-9b8d-0813f88e200d',
  'https://www.figma.com/api/mcp/asset/98fc439c-fd5a-47c3-bf03-652b6baee46b',
  'https://www.figma.com/api/mcp/asset/89f1cd8e-8edb-4974-9840-b80c9662f75f',
  'https://www.figma.com/api/mcp/asset/00a10eeb-94dd-4f84-80f6-c646c4319ba4',
]

export default function QuarentaAnosPage() {

  const [data, setData] = useState(null)
  const [playing, setPlaying] = useState(false)

  const videoRef = useRef(null)
  const goTo = useGoTo()

  useEffect(() => {
    api('quarenta-anos?populate[0]=imagem&populate[1]=video_capa&populate[2]=fotos&populate[3]=cases_destaque.imagem_capa').then(setData)
  }, [])

  const fotos = data?.fotos?.length
    ? data.fotos.map(f => mediaUrl(f))
    : FOTOS_FIGMA

  const cases = data?.cases_destaque ?? []

  const anos = [...new Set(
    cases.map(c => c.Data ? new Date(c.Data).getFullYear() : null)
      .filter(Boolean)
      .sort()
  )]

  return (
    <div className="qa-page">

      {/* HERO */}
      <section className="qa-hero">
        {playing && data?.video_url
          ? <video ref={videoRef} className="qa-hero__bg" src={data.video_url} autoPlay playsInline />
          : data?.video_capa
          ? <img className="qa-hero__bg" src={mediaUrl(data.video_capa)} alt="" />
          : null
        }
        <div className="qa-hero__overlay" />
      </section>

      {/* COMPOSIÇÃO — tudo dentro do SVG, coordenadas 1:1 com o frame Figma 516:2603 */}
      {/*
          Frame Figma: 1366 × 3380 px
          Seção de composição começa em y_figma = 700
          Mapeamento: y_svg = y_figma − 700
      */}
      <section className="qa-composicao">
        <svg
          className="qa-svg"
          viewBox="0 0 1366 1720"
          xmlns="http://www.w3.org/2000/svg"
        >

          {/* ── FOTOS (camada mais atrás) ────────────────────────── */}

          {/* Sergio  — esq, atrás do "4" */}
          {fotos[0] && (
            <image
              href={fotos[0]}
              x="40" y="814"
              width="578" height="375"
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {/* Selma — esq, abaixo do Sergio */}
          {fotos[2] && (
            <image
              href={fotos[2]}
              x="40" y="1240"
              width="578" height="374"
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {/* Prédio — dir, dentro do buraco do "0" */}
          {fotos[1] && (
            <image
              href={fotos[1]}
              x="775" y="988"
              width="578" height="328"
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {/* Máquina — dir, abaixo do Prédio */}
          {fotos[3] && (
            <image
              href={fotos[3]}
              x="673" y="1316"
              width="524" height="376"
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {/* ── "4" — path nativo, sem transform ────────────────── */}
          {/*  Vector4 viewBox 0 0 571 897; path vai de x=−43 até x=571 */}
          {/*  Figma: x=−43, y=700 → y_svg = 0                        */}
          <path
            d="M570.973 752.706V874.707C570.973 886.506 561.418 896.068 549.628 896.068H385.116C373.326 896.068 363.771 886.506 363.771 874.707V774.068C363.771 762.268 354.217 752.706 342.427 752.706H-21.6556C-33.4454 752.706 -43 743.144 -43 731.345V593.709C-43 573.657 -38.2748 553.896 -29.2182 536.011L236.307 11.7063C239.944 4.52027 247.309 0 255.347 0H427.48C443.404 0 453.723 16.8177 446.52 31.0276L192.692 532.221C185.488 546.431 195.807 563.249 211.731 563.249H549.605C561.395 563.249 570.95 572.811 570.95 584.61V752.695L570.973 752.706Z"
            fill="white"
          />

          {/* ── "0" donut — translate para posição Figma ─────────── */}
          {/*  Figma: x=487, y=1391 → y_svg = 691                     */}
          {/*  fillRule evenodd cria o buraco que revela as fotos dir  */}
          <g transform="translate(487, 691)">
            <path
              fillRule="evenodd"
              d="M788.635 789.897C699.032 878.655 589.988 923.034 461.517 923.034C333.045 923.034 223.979 878.655 134.399 789.897C44.7957 701.14 0 591.689 0 461.511C0 331.333 44.7957 221.882 134.399 133.125C223.979 44.3671 333.022 0 461.517 0C590.012 0 699.032 44.3787 788.635 133.125C878.215 221.882 923.034 331.356 923.034 461.511C923.034 591.666 878.226 701.151 788.635 789.897ZM277.045 651.704C326.492 700.734 387.99 725.243 461.528 725.243C535.067 725.243 596.554 700.734 646.001 651.704C695.448 602.697 720.177 539.296 720.177 461.523C720.177 383.75 695.459 320.371 646.001 271.341C596.554 222.334 535.055 197.802 461.528 197.802C388.002 197.802 326.492 222.334 277.045 271.341C227.598 320.371 202.868 383.773 202.868 461.523C202.868 539.272 227.586 602.697 277.045 651.704Z"
              fill="white"
            />
          </g>

          {/* ── TEXTOS (camada mais à frente) ────────────────────── */}

          {/* Lorem — Figma x=802 y=854 → y_svg=154 */}
          {data?.descricao && (
            <foreignObject x="802" y="154" width="524" height="200">
              <div xmlns="http://www.w3.org/1999/xhtml" className="qa-lorem-fo">
                {data.descricao}
              </div>
            </foreignObject>
          )}

          {/* ANOS DE — Figma x=360 y=1051 → y_svg=351 */}
          {/*  Gilroy 900 italic 72px, line-height ≈ 0.9              */}
          <text
            fontFamily="Gilroy, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="72"
            fill="white"
          >
            <tspan x="360" y="416">ANOS</tspan>
            <tspan x="360" y="481">DE</tspan>
          </text>

          {/* experi ências — Figma x=802 y=1032 → y_svg=332 */}
          {/*  PP Hatton 500 italic 140px, line-height ≈ 0.85         */}
          <text
            fontFamily="PP Hatton, serif"
            fontStyle="italic"
            fontWeight="500"
            fontSize="140"
            fill="white"
          >
            <tspan x="802" y="451">experi</tspan>
            <tspan x="802" y="570">ências</tspan>
          </text>

        </svg>
      </section>

      {/* CASES */}
      {cases.length > 0 && (
        <section className="qa-cases">

          <h2 className="qa-cases__titulo">
            <span className="qa-titulo-case">Case</span>
            <span className="qa-titulo-historias">histórias</span>
          </h2>

          <div className="qa-strip">
            {cases.map((c, i) => (
              <div key={i} className="qa-card">
                {c.imagem_capa && <img src={mediaUrl(c.imagem_capa)} alt={c.titulo || ''} />}
              </div>
            ))}
          </div>

        </section>
      )}

    </div>
  )
}
