import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CasePage from './pages/CasePage.jsx'
import ClientePage from './pages/ClientePage.jsx'
import EspecialidadePage from './pages/EspecialidadePage.jsx'
import CasesPage from './pages/CasesPage.jsx'
import SlugRouter from './pages/SlugRouter.jsx'
import PessoasPage from './pages/PessoasPage.jsx'
import QuarentaAnosPage from './pages/QuarentaAnosPage.jsx'
import TrabalheComenoscoPage from './pages/TrabalheComenoscoPage.jsx'
import TrabalheFormularioPage from './pages/TrabalheFormularioPage.jsx'
import OutrosAssuntosPage from './pages/OutrosAssuntosPage.jsx'
import QuemSomosPage from './pages/QuemSomosPage.jsx'
import SejaClientePage from './pages/SejaClientePage.jsx'
import ClientesGridPage from './pages/ClientesGridPage.jsx'
import { TransitionProvider } from './transition.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TransitionProvider>
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
      </TransitionProvider>
    </BrowserRouter>
  </StrictMode>,
)
