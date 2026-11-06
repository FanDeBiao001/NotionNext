export function inspectContent(posts) {
  const issues = []
  const slugs = new Set()
  for (const post of posts) {
    const slug = post.slug || post.id
    if (slugs.has(slug))
      issues.push({ slug, kind: 'duplicate-slug', message: '文章路径重复' })
    slugs.add(slug)
    if (!post.summary)
      issues.push({ slug, kind: 'missing-summary', message: '缺少摘要' })
    if (!post.title)
      issues.push({ slug, kind: 'missing-title', message: '缺少标题' })
    if (
      Date.now() - new Date(post.lastEditedDate || post.publishDate).getTime() >
      365 * 86400000
    )
      issues.push({ slug, kind: 'stale', message: '超过一年未更新' })
  }
  return issues
}
