import { siteConfig } from '@/lib/config'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import { sha256 } from 'js-sha256'

export async function getAiSummary(api, key, content) {
  try {
    const response = await fetch(api, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: key, content })
    })
    if (!response.ok) return null
    const data = await response.json()
    return typeof data.summary === 'string' ? data.summary.slice(0, 5000) : null
  } catch {
    return null
  }
}

export async function getPageAISummary(post, text) {
  const api = siteConfig('AI_SUMMARY_API')
  if (!api || post.password) return
  const limit = Math.min(
    20000,
    Math.max(100, Number(siteConfig('AI_SUMMARY_WORD_LIMIT', 1000)) || 1000)
  )
  const content = `${post.title || ''} ${text || ''}`.slice(0, limit)
  const key = `ai_summary_${post.id}_${sha256(content)}`
  try {
    const cached = await getDataFromCache(key)
    const summary =
      cached || (await getAiSummary(api, siteConfig('AI_SUMMARY_KEY'), content))
    if (summary) {
      post.aiSummary = summary
      if (!cached)
        await setDataToCache(
          key,
          summary,
          Number(siteConfig('AI_SUMMARY_CACHE_TIME', 1800))
        )
    }
  } catch {
    /* Optional summaries must never fail article rendering. */
  }
}
