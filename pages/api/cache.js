import { invalidateAllCaches } from '@/lib/cache/cache_manager'
import { requireToken, rateLimit } from '@/lib/server/apiSecurity'
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireToken(req, res, process.env.CACHE_REVALIDATION_TOKEN)) return
  if (!(await rateLimit(req, res, 'cache', 5))) return
  try {
    return res.json({ ok: true, ...(await invalidateAllCaches()) })
  } catch {
    return res
      .status(503)
      .json({ ok: false, message: 'Cache invalidation failed.' })
  }
}
