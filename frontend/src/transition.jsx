import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Ctx = createContext(null)

export function useGoTo() {
  return useContext(Ctx).goTo
}

export function useStartCamera() {
  return useContext(Ctx).startCamera
}

export function TransitionProvider({ children }) {
  const navigate = useNavigate()
  const [ativa, setAtiva] = useState(false)
  const [cameraAnim, setCameraAnim] = useState(null) // null | { rect, expanded }
  const timer = useRef(null)
  const overlayVideoRef = useRef(null)
  const cameraTriggered = useRef(false)

  const goTo = useCallback((path, onNavigated) => {
    clearTimeout(timer.current)
    setAtiva(true)
    timer.current = setTimeout(() => {
      navigate(path)
      setAtiva(false)
      if (onNavigated) onNavigated()
    }, 560)
  }, [navigate])

  const startCamera = useCallback((rect) => {
    cameraTriggered.current = false
    setCameraAnim({ rect, expanded: false })
  }, [])

  // Play + expand juntos logo após o overlay montar
  useEffect(() => {
    if (!cameraAnim || cameraTriggered.current) return
    cameraTriggered.current = true

    const video = overlayVideoRef.current
    if (video) {
      video.currentTime = 3
      video.play().catch(() => {})
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCameraAnim(p => p ? { ...p, expanded: true } : null)
    }))
  }, [cameraAnim])

  return (
    <Ctx.Provider value={{ goTo, startCamera }}>
      {children}
      <div className={`cartela ${ativa ? 'cartela--ativa' : ''}`} />
      {cameraAnim && (
        <video
          ref={overlayVideoRef}
          src="/camera-rotation.mp4"
          playsInline
          muted
          style={{
            position: 'fixed',
            zIndex: 9999,
            objectFit: 'cover',
            transition: 'top 0.75s cubic-bezier(0.4,0,0.2,1), left 0.75s cubic-bezier(0.4,0,0.2,1), width 0.75s cubic-bezier(0.4,0,0.2,1), height 0.75s cubic-bezier(0.4,0,0.2,1)',
            top:    cameraAnim.expanded ? 0 : `${cameraAnim.rect.top}px`,
            left:   cameraAnim.expanded ? 0 : `${cameraAnim.rect.left}px`,
            width:  cameraAnim.expanded ? '100vw' : `${cameraAnim.rect.width}px`,
            height: cameraAnim.expanded ? '100vh' : `${cameraAnim.rect.height}px`,
          }}
          onTimeUpdate={e => {
            if (e.target.currentTime >= 12) {
              e.target.pause()
              setCameraAnim(null)
              navigate('/quarenta-anos')
            }
          }}
        />
      )}
    </Ctx.Provider>
  )
}
