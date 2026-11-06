import { randomBytes, createCipheriv } from 'node:crypto'
import { redisClient } from '@/lib/cache/redis_cache'
import {
  privateResponse,
  rateLimit,
  requireToken,
  safeEqual
} from './apiSecurity'

const cookieName = 'nn_oauth_state'
const cookie = (value, age) =>
  `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
const configured = () =>
  process.env.OAUTH_CLIENT_ID &&
  process.env.OAUTH_CLIENT_SECRET &&
  process.env.OAUTH_REDIRECT_URI &&
  /^[a-f0-9]{64}$/i.test(process.env.OAUTH_TOKEN_ENCRYPTION_KEY || '') &&
  typeof redisClient.set === 'function'

export async function startOAuth(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireToken(req, res, process.env.ADMIN_API_TOKEN)) return
  if (!configured())
    return res
      .status(503)
      .json({
        message:
          'OAuth requires client credentials, redirect URI, Redis and an encryption key.'
      })
  if (!(await rateLimit(req, res, 'oauth-start', 5))) return
  const state = randomBytes(32).toString('hex')
  await redisClient.set(`nn:oauth:state:${state}`, '1', 'EX', 600)
  res.setHeader('Set-Cookie', cookie(state, 600))
  const url = new URL('https://api.notion.com/v1/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: process.env.OAUTH_CLIENT_ID,
    response_type: 'code',
    owner: 'user',
    redirect_uri: process.env.OAUTH_REDIRECT_URI,
    state
  }).toString()
  return res.json({ url: url.toString() })
}

export async function finishOAuth(req, res) {
  privateResponse(res)
  if (req.method !== 'GET') return res.status(405).end()
  if (!configured())
    return res.status(503).json({ message: 'OAuth is not configured.' })
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const saved = req.cookies?.[cookieName] || ''
  res.setHeader('Set-Cookie', cookie('', 0))
  if (!/^[a-f0-9]{64}$/.test(state) || !safeEqual(state, saved))
    return res
      .status(400)
      .json({
        message:
          'Invalid authorization state. Start again from the owner console.'
      })
  try {
    const valid = await redisClient.eval(
      "local v=redis.call('GET',KEYS[1]); redis.call('DEL',KEYS[1]); return v",
      1,
      `nn:oauth:state:${state}`
    )
    if (!valid)
      return res
        .status(400)
        .json({ message: 'Authorization expired or already used.' })
    if (req.query.error)
      return res.redirect(303, '/auth/result?status=cancelled')
    if (typeof req.query.code !== 'string')
      return res.status(400).json({ message: 'Missing authorization code.' })
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: process.env.OAUTH_REDIRECT_URI
      })
    })
    if (!response.ok) throw new Error('Token exchange failed')
    const data = await response.json()
    if (!data.access_token || !/^[a-f0-9-]{32,36}$/i.test(data.workspace_id))
      throw new Error('Invalid token response')
    const iv = randomBytes(12)
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.OAUTH_TOKEN_ENCRYPTION_KEY, 'hex'),
      iv
    )
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ])
    await redisClient.set(
      `nn:oauth:workspace:${data.workspace_id}`,
      JSON.stringify({
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex'),
        data: encrypted.toString('base64')
      })
    )
    return res.redirect(303, '/auth/result?status=connected')
  } catch {
    return res.redirect(303, '/auth/result?status=failed')
  }
}
