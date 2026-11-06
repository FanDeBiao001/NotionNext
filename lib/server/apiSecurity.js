import { createHash, timingSafeEqual } from 'node:crypto'
import { redisClient } from '@/lib/cache/redis_cache'

const windows = new Map()

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const hash = value => createHash('sha256').update(value).digest()
  return timingSafeEqual(hash(a), hash(b))
}

export function privateResponse(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

export function requireToken(req, res, token) {
  privateResponse(res)
  if (!token) {
    res
      .status(503)
      .json({ ok: false, message: 'This operation is not configured.' })
    return false
  }
  if (!safeEqual(req.headers.authorization || '', `Bearer ${token}`)) {
    res.status(401).json({ ok: false, message: 'Unauthorized' })
    return false
  }
  return true
}

// Redis shares limits across instances. Local fallback is bounded and expires.
export async function rateLimit(req, res, scope, limit = 10, seconds = 60) {
  const ip = String(
    req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  )
    .split(',')[0]
    .trim()
  const key = `nn:limit:${scope}:${createHash('sha256').update(ip).digest('hex')}`
  let count
  try {
    if (typeof redisClient.eval === 'function') {
      count = Number(
        await redisClient.eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
          1,
          key,
          seconds
        )
      )
    } else {
      const now = Date.now()
      for (const [k, value] of windows)
        if (value.expires <= now) windows.delete(k)
      if (windows.size >= 10000 && !windows.has(key)) {
        res.status(503).json({ ok: false, message: 'Please try again later.' })
        return false
      }
      const value = windows.get(key) || {
        count: 0,
        expires: now + seconds * 1000
      }
      count = ++value.count
      windows.set(key, value)
    }
  } catch {
    res
      .status(503)
      .json({ ok: false, message: 'Rate limit service unavailable.' })
    return false
  }
  if (count > limit) {
    res.setHeader('Retry-After', String(seconds))
    res.status(429).json({
      ok: false,
      message: 'Too many requests. Please try again later.'
    })
    return false
  }
  return true
}

export function localPath(value) {
  if (
    typeof value !== 'string' ||
    value.length > 1000 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s?#]/.test(value)
  )
    return null
  return value.length > 1 ? value.replace(/\/$/, '') : value
}
