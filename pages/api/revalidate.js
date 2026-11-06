import BLOG from '@/blog.config'
import { extractLangPrefix } from '@/lib/utils/pageId'
import { pathsForSite } from '@/lib/server/refreshPaths'
import { invalidateAllCaches } from '@/lib/cache/cache_manager'
import { localPath, rateLimit, requireToken } from '@/lib/server/apiSecurity'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireToken(req, res, process.env.REVALIDATION_TOKEN)) return
  if (!(await rateLimit(req, res, 'revalidate', 5))) return
  const { path, paths, all } = req.body || {}
  const targets = paths || (path ? [path] : ['/'])
  if (
    !Array.isArray(targets) ||
    targets.length > 50 ||
    !targets.length ||
    targets.some(p => !localPath(p))
  )
    return res
      .status(400)
      .json({
        ok: false,
        message: 'Provide 1–50 absolute local paths without queries.'
      })
  try {
    // Invalidate source caches first so every regenerated page uses fresh content.
    const invalidation = await invalidateAllCaches()
    const { fetchGlobalAllData } = await import('@/lib/db/SiteDataApi')
    let requested = targets
    if (all === true) {
      requested = []
      const locales = [
        BLOG.LANG,
        ...BLOG.NOTION_PAGE_ID.split(',').slice(1).map(extractLangPrefix)
      ].filter(Boolean)
      for (const locale of [...new Set(locales)]) {
        const data = await fetchGlobalAllData({ from: 'revalidate', locale })
        if (data.dataError) throw new Error('Content source unavailable')
        requested.push(...pathsForSite(data, locale))
      }
    }
    const results = []
    for (const p of [...new Set(requested)]) {
      const normalized = localPath(p)
      if (!normalized) continue
      try {
        await res.revalidate(normalized)
        results.push({ path: normalized, revalidated: true })
      } catch {
        results.push({ path: normalized, revalidated: false })
      }
    }
    const ok = results.every(r => r.revalidated)
    return res.status(ok ? 200 : 207).json({ ok, ...invalidation, results })
  } catch {
    return res
      .status(503)
      .json({ ok: false, message: 'Refresh failed. Please retry.' })
  }
}
