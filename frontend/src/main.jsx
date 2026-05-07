import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CasePage from './pages/CasePage.jsx'
import ClientePage from './pages/ClientePage.jsx'
import EspecialidadePage from './pages/EspecialidadePage.jsx'
import PessoasPage from './pages/PessoasPage.jsx'
import QuarentaAnosPage from './pages/QuarentaAnosPage.jsx'
import { TransitionProvider } from './transition.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TransitionProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/contato" element={<App />} />
          <Route path="/pessoas" element={<PessoasPage />} />
          <Route path="/quarenta-anos" element={<QuarentaAnosPage />} />
          <Route path="/cases/:especialidade" element={<EspecialidadePage />} />
          <Route path="/:cliente" element={<ClientePage />} />
          <Route path="/:cliente/:case" element={<CasePage />} />
        </Routes>
      </TransitionProvider>
    </BrowserRouter>
  </StrictMode>,
)
