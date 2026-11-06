export const seriesName = post =>
  String(post?.series || post?.ext?.series || '').trim()
export function collectSeries(posts) {
  const groups = new Map()
  for (const post of posts || []) {
    const name = seriesName(post)
    if (!name || post.status !== 'Published' || post.password) continue
    const group = groups.get(name) || {
      name,
      description: post.ext?.seriesDescription || '',
      posts: []
    }
    group.posts.push({
      id: post.id,
      title: post.title || '未命名文章',
      slug: post.slug || post.id,
      order: Number(post.seriesOrder || post.ext?.seriesOrder || 0) || 0
    })
    groups.set(name, group)
  }
  return [...groups.values()].map(group => ({
    ...group,
    posts: group.posts.sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title)
    )
  }))
}
