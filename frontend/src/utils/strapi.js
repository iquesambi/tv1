import axios from 'axios'
import { cacheAPI } from '../hooks/useApiCache.js'

// Em produção (Firebase), usa /api (arquivos estáticos)
// Em desenvolvimento, usa localhost ou servidor remoto
const STRAPI = import.meta.env.MODE === 'production'
  ? ''  // Em produção, as URLs serão /api/endpoint.json
  : 'https://tv1-53ev.onrender.com'

export const api = (path) => {
  const url = import.meta.env.MODE === 'production'
    ? `/api/${path}.json`  // Em produção: /api/navigation.json
    : `${STRAPI}/api/${path}`  // Em dev: https://tv1-53ev.onrender.com/api/navigation
  return axios.get(url).then(r => r.data.data).catch(() => null)
}

export const apiWithCache = (path, ttlMinutes = 120) => {
  const cached = cacheAPI.get(path, ttlMinutes)
  if (cached) return Promise.resolve(cached)
  const url = import.meta.env.MODE === 'production'
    ? `/api/${path}.json`  // Em produção: /api/navigation.json
    : `${STRAPI}/api/${path}`  // Em dev: https://tv1-53ev.onrender.com/api/navigation
  return axios.get(url).then(r => {
    cacheAPI.set(path, r.data.data)
    return r.data.data
  }).catch(() => null)
}

export const mediaUrl = (obj) => {
  if (!obj?.url) return null
  // URLs absolutas (Cloudinary) retornam direto
  if (obj.url.startsWith('http')) return obj.url
  // URLs relativas: prepende o host do Strapi
  if (import.meta.env.MODE === 'production') {
    return `https://tv1-53ev.onrender.com${obj.url}`
  }
  return `${STRAPI}${obj.url}`
}

export const externalUrl = (url) => {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export { STRAPI }
