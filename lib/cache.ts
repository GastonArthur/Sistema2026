
const cache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_DURATION_MS = 60 * 1000 // 1 minuto

export const getFromCache = (key: string) => {
  const entry = cache[key]
  if (!entry) return null

  const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS
  if (isExpired) {
    delete cache[key]
    return null
  }

  return entry.data
}

export const setInCache = (key: string, data: any) => {
  cache[key] = {
    data,
    timestamp: Date.now(),
  }
}

export const invalidateCache = (key?: string) => {
  if (key) {
    delete cache[key]
  } else {
    // Invalida toda la caché si no se especifica una clave
    Object.keys(cache).forEach(k => delete cache[k])
  }
}
