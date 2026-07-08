import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
// CasesPage fica de fora do lazy-loading: Menu.jsx (montado em toda
// página) já importa prefetchCases/casesAnchorDisponivel dela de forma
// estática, então seu código já entra no bundle principal de qualquer
// jeito — lazy aqui não economizaria nada, só adicionaria um Suspense à toa.
import CasesPage from './pages/CasesPage.jsx'
import { TransitionProvider } from './transition.jsx'

const CasePage               = lazy(() => import('./pages/CasePage.jsx'))
const EspecialidadePage      = lazy(() => import('./pages/EspecialidadePage.jsx'))
const SlugRouter             = lazy(() => import('./pages/SlugRouter.jsx'))
const PessoasPage            = lazy(() => import('./pages/PessoasPage.jsx'))
const QuarentaAnosPage       = lazy(() => import('./pages/QuarentaAnosPage.jsx'))
const TrabalheComenoscoPage  = lazy(() => import('./pages/TrabalheComenoscoPage.jsx'))
const TrabalheFormularioPage = lazy(() => import('./pages/TrabalheFormularioPage.jsx'))
const OutrosAssuntosPage     = lazy(() => import('./pages/OutrosAssuntosPage.jsx'))
const QuemSomosPage          = lazy(() => import('./pages/QuemSomosPage.jsx'))
const SejaClientePage        = lazy(() => import('./pages/SejaClientePage.jsx'))
const ClientesGridPage       = lazy(() => import('./pages/ClientesGridPage.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TransitionProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/contato" element={<App />} />
            <Route path="/contato/seja-cliente" element={<SejaClientePage />} />
            <Route path="/contato/trabalhe-conosco" element={<TrabalheComenoscoPage />} />
            <Route path="/contato/trabalhe-conosco/formulario" element={<TrabalheFormularioPage />} />
            <Route path="/contato/outros-assuntos" element={<OutrosAssuntosPage />} />
            <Route path="/clientes" element={<ClientesGridPage />} />
            <Route path="/quem-somos" element={<QuemSomosPage />} />
            <Route path="/pessoas" element={<PessoasPage />} />
            <Route path="/quarenta-anos" element={<QuarentaAnosPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:especialidade" element={<EspecialidadePage />} />
            <Route path="/:slug" element={<SlugRouter />} />
            <Route path="/:slug/:case" element={<CasePage />} />
          </Routes>
        </Suspense>
      </TransitionProvider>
    </BrowserRouter>
  </StrictMode>,
)
