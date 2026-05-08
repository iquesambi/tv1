// Utility cache (can be used outside React components)
export const cacheAPI = {
  get(key, ttlMinutes = 60) {
    try {
      const cacheKey = `api_cache_${key}`
      const timeKey = `api_cache_time_${key}`
      const cached = localStorage.getItem(cacheKey)
      const time = localStorage.getItem(timeKey)
      if (!cached || !time) return null

      const age = (Date.now() - parseInt(time)) / 1000 / 60
      if (age > ttlMinutes) {
        localStorage.removeItem(cacheKey)
        localStorage.removeItem(timeKey)
        return null
      }
      return JSON.parse(cached)
    } catch {
      return null
    }
  },

  set(key, data) {
    try {
      const cacheKey = `api_cache_${key}`
      const timeKey = `api_cache_time_${key}`
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(timeKey, Date.now().toString())
    } catch {}
  },

  clear(key) {
    const cacheKey = `api_cache_${key}`
    const timeKey = `api_cache_time_${key}`
    localStorage.removeItem(cacheKey)
    localStorage.removeItem(timeKey)
  },
}

// Hook for React components
export function useApiCache(key, ttlMinutes = 60) {
  return {
    getCached: () => cacheAPI.get(key, ttlMinutes),
    setCached: (data) => cacheAPI.set(key, data),
    clear: () => cacheAPI.clear(key),
  }
}
