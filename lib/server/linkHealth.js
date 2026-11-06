import https from 'node:https'
import { resolve4 } from 'node:dns/promises'

export function publicIPv4(ip) {
  const parts = ip.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)
  )
    return false
  const [a, b] = parts
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && [0, 168].includes(b)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && [18, 19].includes(b))
  )
}

export async function checkPublicUrl(raw) {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.port || url.username || url.password)
      return {
        status: 'skipped',
        reason: 'Only standard HTTPS URLs are checked'
      }
    const addresses = await Promise.race([
      resolve4(url.hostname),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error('DNS timeout')), 4000)
        timer.unref?.()
      })
    ])
    if (!addresses.length || addresses.some(ip => !publicIPv4(ip)))
      return { status: 'skipped', reason: 'Non-public address' }
    // Pin the validated IP for this request. Do not follow redirects or forward credentials.
    return await new Promise(resolve => {
      const request = https.request(
        url,
        {
          method: 'HEAD',
          family: 4,
          lookup: (_host, _options, callback) =>
            callback(null, addresses[0], 4),
          timeout: 5000
        },
        response => {
          response.resume()
          const code = response.statusCode
          resolve({
            status:
              code >= 200 && code < 400
                ? 'ok'
                : [404, 410].includes(code)
                  ? 'broken'
                  : 'unknown',
            code
          })
        }
      )
      request.on('timeout', () => request.destroy(new Error('Timeout')))
      request.on('error', () =>
        resolve({ status: 'unknown', reason: 'Connection failed' })
      )
      request.end()
    })
  } catch {
    return { status: 'unknown', reason: 'URL or DNS unavailable' }
  }
}

export async function auditBackupLinks(backup) {
  const urls = new Set(backup.images)
  for (const page of backup.pages) {
    const visit = value => {
      if (typeof value === 'string' && /^https:\/\//.test(value)) {
        try {
          urls.add(new URL(value).toString())
        } catch {}
      } else if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object')
        Object.values(value).forEach(visit)
    }
    visit(page.blockMap)
  }
  const targets = [...urls].slice(0, 40)
  const results = []
  for (let i = 0; i < targets.length; i += 4)
    await Promise.all(
      targets
        .slice(i, i + 4)
        .map(async url => results.push({ url, ...(await checkPublicUrl(url)) }))
    )
  return {
    results,
    total: urls.size,
    checked: targets.length,
    omitted: Math.max(0, urls.size - targets.length),
    failedPages: backup.failures
  }
}
