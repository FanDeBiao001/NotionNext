import { auditBackupLinks } from '@/lib/server/linkHealth'
import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { cacheStats, invalidateAllCaches } from '@/lib/cache/cache_manager'
import { requireToken, rateLimit, localPath } from '@/lib/server/apiSecurity'
import { inspectContent } from '@/lib/content/health'
import { createContentBackup } from '@/lib/server/contentBackup'

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end()
  if (!requireToken(req, res, process.env.ADMIN_API_TOKEN)) return
  if (!(await rateLimit(req, res, 'admin', 20))) return
  try {
    if (req.method === 'POST') {
      const path = localPath(req.body?.path)
      if (!path)
        return res.status(400).json({ message: '请输入以 / 开头的页面路径。' })
      await invalidateAllCaches()
      const results = []
      for (const route of [
        ...new Set([
          path,
          '/',
          '/archive',
          '/category',
          '/tag',
          '/search',
          '/series'
        ])
      ]) {
        try {
          await res.revalidate(route)
          results.push({ path: route, ok: true })
        } catch {
          results.push({ path: route, ok: false })
        }
      }
      return res
        .status(results.every(r => r.ok) ? 200 : 207)
        .json({
          results,
          message: results.every(r => r.ok)
            ? '页面和关联列表已刷新。'
            : '部分页面刷新失败，请查看结果并重试。'
        })
    }
    const data = await fetchGlobalAllData({
      from: 'owner-console',
      locale:
        typeof req.query.locale === 'string' ? req.query.locale : undefined
    })
    if (data.dataError || !data.allPages?.length)
      return res
        .status(503)
        .json({ message: '未读取到站点内容，请检查 Notion 配置和连接。' })
    if (req.query.action === 'links')
      return res.json(await auditBackupLinks(await createContentBackup(data)))
    if (req.query.action === 'backup') {
      const backup = await createContentBackup(data)
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="notionnext-backup.json"'
      )
      return res.json(backup)
    }
    return res.json({
      checkedAt: new Date().toISOString(),
      latestContentUpdate: data.allPages.reduce(
        (max, p) =>
          Math.max(max, new Date(p.lastEditedDate || 0).getTime() || 0),
        0
      ),
      posts: data.allPages.filter(p => p.type === 'Post').length,
      cache: { ...cacheStats, shared: Boolean(BLOG.REDIS_URL) },
      issues: inspectContent(
        data.allPages.filter(p => p.status === 'Published')
      ),
      configured: {
        newsletter: Boolean(BLOG.MAILCHIMP_API_KEY && BLOG.MAILCHIMP_LIST_ID),
        oauth: Boolean(
          process.env.OAUTH_CLIENT_ID &&
          process.env.OAUTH_TOKEN_ENCRYPTION_KEY &&
          BLOG.REDIS_URL
        ),
        articleSessions: Boolean(
          process.env.ARTICLE_SESSION_SECRET || process.env.REVALIDATION_TOKEN
        )
      }
    })
  } catch {
    return res
      .status(503)
      .json({ message: '操作失败，请检查服务端日志与连接配置。' })
  }
}
