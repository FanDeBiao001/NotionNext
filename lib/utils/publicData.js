import BLOG from '@/blog.config'
const secrets =
  /^(?:AI_SUMMARY_KEY|MAILCHIMP_API_KEY|ALGOLIA_ADMIN_APP_KEY|NOTION_TOKEN(?:_V2)?|REDIS_URL|REVALIDATION_TOKEN|CACHE_REVALIDATION_TOKEN|ADMIN_API_TOKEN|ARTICLE_SESSION_SECRET|OAUTH_.*|CLERK_SECRET_KEY)$/
const bodyFields = new Set([
  'blockMap',
  'content',
  'toc',
  'aiSummary',
  'originalityProof',
  'results'
])

export function sanitizeClientProps(value, unlocked = false) {
  if (value == null || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value))
    return value.map(item => sanitizeClientProps(item, unlocked))
  const protectedPost = Boolean(
    value.password || value[BLOG.NOTION_PROPERTY_NAME?.password]
  )
  const result = {}
  for (const [key, item] of Object.entries(value)) {
    if (key === 'allPages' || secrets.test(key)) continue
    if (protectedPost && bodyFields.has(key) && !unlocked) continue
    if (
      key.toLowerCase() === 'password' ||
      key === BLOG.NOTION_PROPERTY_NAME?.password
    ) {
      result[key] = item ? 'protected' : ''
      continue
    }
    result[key] = sanitizeClientProps(item, unlocked)
  }
  return result
}
