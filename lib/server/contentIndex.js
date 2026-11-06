import { fetchGlobalAllData, getPostBlocks } from '@/lib/db/SiteDataApi'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { getOrSetDataWithCustomCache } from '@/lib/cache/cache_manager'
import { sanitizeClientProps } from '@/lib/utils/publicData'

export async function readArticle(post) {
  if (post.password) return null
  const raw = await getPostBlocks(post.id, 'content-index', {
    cacheVersion: post.lastEditedDate
  })
  const blockMap = adapterNotionBlockMap(raw)
  blockMap.block = formatNotionBlock(blockMap.block)
  const content =
    blockMap.block?.[post.id]?.value?.content ||
    Object.keys(blockMap.block || {}).filter(
      id => blockMap.block[id]?.value?.parent_id === post.id
    )
  return { ...post, content, blockMap }
}

export async function buildContentIndex(locale) {
  return getOrSetDataWithCustomCache(
    `search_index_${locale || 'default'}`,
    300,
    async () => {
      const data = await fetchGlobalAllData({ from: 'search-index', locale })
      if (data.dataError) throw new Error('Content source unavailable')
      const posts = data.allPages.filter(
        p =>
          p.type === 'Post' &&
          p.status === 'Published' &&
          !p.password &&
          !/^https?:/.test(p.slug)
      )
      const documents = []
      const failures = []
      // Bounded concurrency avoids overwhelming Notion on a cold build.
      for (let i = 0; i < posts.length; i += 3) {
        await Promise.all(
          posts.slice(i, i + 3).map(async post => {
            let text = ''
            try {
              const full = await readArticle(post)
              text = getPageContentText(full, full.blockMap)
            } catch {
              failures.push(post.slug || post.id)
            }
            documents.push({
              id: post.id,
              slug: post.slug || post.id,
              title: post.title || '',
              summary: post.summary || '',
              tags: post.tags || [],
              categories: Array.isArray(post.category)
                ? post.category
                : [post.category].filter(Boolean),
              text: text.slice(0, 100000)
            })
          })
        )
      }
      return { documents, failures, generatedAt: new Date().toISOString() }
    }
  )
}

export async function searchPageProps(locale) {
  const data = await fetchGlobalAllData({ from: 'search-page', locale })
  return {
    ...sanitizeClientProps(data),
    searchIndex: await buildContentIndex(locale)
  }
}
