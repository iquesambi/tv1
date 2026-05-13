import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Ctx = createContext(null)

export function useGoTo() {
  return useContext(Ctx)
}

export function TransitionProvider({ children }) {
  const navigate = useNavigate()
  const [ativa, setAtiva] = useState(false)
  const timer = useRef(null)

  const goTo = useCallback((path, onNavigated) => {
    clearTimeout(timer.current)

    // 1. cartela entra cobrindo a home (que continua montada)
    setAtiva(true)

    timer.current = setTimeout(() => {
      // 2. cartela cobriu tudo → navega (home desmonta, nova página monta)
      navigate(path)
      // 3. remove cartela instantaneamente — nova página já está lá
      setAtiva(false)
      // 4. executa callback após navegação completar
      if (onNavigated) onNavigated()
    }, 560)
  }, [navigate])

  return (
    <Ctx.Provider value={goTo}>
      {children}
      <div className={`cartela ${ativa ? 'cartela--ativa' : ''}`} />
    </Ctx.Provider>
  )
}
