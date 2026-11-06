import { rateLimit } from '@/lib/server/apiSecurity'

export function allowedModelUrl(raw) {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    const model = url.hostname === 'raw.githubusercontent.com' && /^\/isHarryh\/Ark-Models\/(?:refs\/heads\/main|main)\/models\/[a-zA-Z0-9_./-]+$/.test(url.pathname)
    const catalog = url.hostname === 'api.github.com' && url.pathname === '/repos/isHarryh/Ark-Models/contents/models'
    return (model || catalog) && !url.search && !url.hash ? url : null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const url = typeof req.query.url === 'string' && allowedModelUrl(req.query.url)
  if (!url) return res.status(400).json({ error: 'Unsupported model resource.' })
  if (!await rateLimit(req, res, 'model', 120)) return
  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NotionNext-Shimeji/1.0' } })
    if (!response.ok) return res.status(502).end()
    const max = 20 * 1024 * 1024
    if (Number(response.headers.get('content-length')) > max) { await response.body?.cancel(); return res.status(413).end() }
    const chunks = []
    let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > max) return res.status(413).end()
      chunks.push(Buffer.from(chunk))
    }
    res.setHeader('Content-Type', url.hostname === 'api.github.com' ? 'application/json' : /\.png$/.test(url.pathname) ? 'image/png' : 'application/octet-stream')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.send(Buffer.concat(chunks))
  } catch { return res.status(502).json({ error: 'Model resource unavailable.' }) }
}
