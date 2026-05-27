import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAMERA_START_TIME } from './cameraConfig.js'

const Ctx = createContext(null)

export function useGoTo() {
  return useContext(Ctx).goTo
}

export function useStartCamera() {
  return useContext(Ctx).startCamera
}

export function useCameraAtiva() {
  return useContext(Ctx).cameraAtiva
}

export function TransitionProvider({ children }) {
  const navigate = useNavigate()
  const [ativa, setAtiva] = useState(false)
  const [cameraAnim, setCameraAnim] = useState(null) // null | { rect, expanded }
  const timer = useRef(null)
  const overlayVideoRef = useRef(null)
  const cameraTriggered = useRef(false)

  const goTo = useCallback((path, onNavigated, state) => {
    clearTimeout(timer.current)
    setAtiva(true)
    timer.current = setTimeout(() => {
      navigate(path, state ? { state } : undefined)
      setAtiva(false)
      if (onNavigated) onNavigated()
    }, 560)
  }, [navigate])

  const startCamera = useCallback((rect) => {
    cameraTriggered.current = false
    setCameraAnim({ rect, expanded: false })
  }, [])

  // Play + expand logo após o overlay montar
  useEffect(() => {
    if (!cameraAnim || cameraTriggered.current) return
    cameraTriggered.current = true

    const video = overlayVideoRef.current
    if (video) {
      video.currentTime = CAMERA_START_TIME
      video.playbackRate = 1.3
      video.play().catch(() => {})
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCameraAnim(p => p ? { ...p, expanded: true } : null)
    }))
  }, [cameraAnim])

  return (
    <Ctx.Provider value={{ goTo, startCamera, cameraAtiva: !!cameraAnim }}>
      {children}
      <div className={`cartela ${ativa ? 'cartela--ativa' : ''}`} />
      {cameraAnim && (
        <video
          ref={overlayVideoRef}
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
            // Congela 3 frames antes do fim (30fps → 0.1s antes da duração)
            const freezeAt = (e.target.duration || 4.866) - 3 / 30
            if (e.target.currentTime >= freezeAt) {
              e.target.pause()
              navigate('/quarenta-anos')
              setTimeout(() => setCameraAnim(null), 400)
            }
          }}
        >
          <source src="/camera-rotation-alpha.webm" type="video/webm" />
          <source src="/camera-rotation-alpha.mov" type="video/mp4; codecs=hvc1" />
        </video>
      )}
    </Ctx.Provider>
  )
}
