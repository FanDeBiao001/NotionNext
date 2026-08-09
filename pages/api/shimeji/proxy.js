/**
 * Shimeji CORS proxy — fetches remote resources server-side
 * Usage: /api/shimeji/proxy?url=https://...
 */
export default async function handler(req, res) {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: 'Missing url' })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NotionNext-Shimeji/1.0',
        'Accept': req.headers.accept || '*/*'
      }
    })
    clearTimeout(timeout)

    if (!resp.ok) return res.status(resp.status).end()

    const contentType = resp.headers.get('content-type') || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Access-Control-Allow-Origin', '*')

    const buffer = await resp.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (err) {
    res.status(502).json({ error: err.message || 'timeout' })
  }
}
