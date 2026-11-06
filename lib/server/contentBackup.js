import { createHash } from 'node:crypto'
import { readArticle } from './contentIndex'
import { sanitizeClientProps } from '@/lib/utils/publicData'

export async function createContentBackup(data) {
  const posts = data.allPages.filter(
    post =>
      ['Post', 'Page'].includes(post.type) &&
      post.status === 'Published' &&
      !post.password
  )
  const pages = []
  const failures = []
  for (const post of posts) {
    try {
      const page = await readArticle(post)
      if (!page?.blockMap?.block) throw new Error('Missing blocks')
      pages.push(sanitizeClientProps(page))
    } catch {
      failures.push(post.slug || post.id)
    }
  }
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    site: sanitizeClientProps(data.siteInfo),
    pages,
    failures,
    images: [
      ...new Set(
        pages.flatMap(page =>
          Object.values(page.blockMap.block)
            .map(
              entry =>
                entry.value?.format?.display_source ||
                entry.value?.properties?.source?.[0]?.[0]
            )
            .filter(url => typeof url === 'string' && /^https?:/.test(url))
        )
      )
    ]
  }
  return {
    ...payload,
    sha256: createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  }
}
