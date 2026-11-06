import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import { privateResponse, rateLimit } from '@/lib/server/apiSecurity'
import {
  articleCookieName,
  articleSession,
  matchesPassword,
  validArticleSession
} from '@/lib/server/articleAccess'
import { sanitizeClientProps } from '@/lib/utils/publicData'

export default async function handler(req, res) {
  privateResponse(res)
  if (req.method !== 'POST') return res.status(405).end()
  if (!(await rateLimit(req, res, 'article-unlock', 10))) return
  const { slug, locale, password } = req.body || {}
  if (
    typeof slug !== 'string' ||
    slug.length > 500 ||
    (locale && (typeof locale !== 'string' || locale.length > 20))
  )
    return res.status(400).end()
  try {
    const data = await fetchGlobalAllData({ from: 'article-access', locale })
    if (data.dataError) throw new Error('Content source unavailable')
    const post = data.allPages.find(
      p =>
        ['Post', 'Page'].includes(p.type) &&
        ['Published', 'Invisible'].includes(p.status) &&
        (p.slug === slug || p.id === slug)
    )
    if (!post) return res.status(404).json({ message: '文章不存在。' })
    if (
      post.password &&
      !matchesPassword(post, password) &&
      !validArticleSession(post, req.cookies?.[articleCookieName(post.id)])
    )
      return res.status(401).json({ message: '密码错误或会话已过期。' })
    const props = await resolvePostProps({
      prefix: post.slug || post.id,
      locale,
      includeProtected: true,
      from: 'article-unlock'
    })
    if (!props.post?.blockMap?.block)
      throw new Error('Article body unavailable')
    if (post.password) {
      const token = articleSession(post)
      if (token)
        res.setHeader(
          'Set-Cookie',
          `${articleCookieName(post.id)}=${token}; Path=/api/article; Max-Age=86400; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
        )
    }
    return res.json({ post: sanitizeClientProps(props.post, true) })
  } catch {
    return res.status(503).json({ message: '文章暂时无法加载，请稍后再试。' })
  }
}
