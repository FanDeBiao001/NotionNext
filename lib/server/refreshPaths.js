import BLOG from '@/blog.config'
export function pathsForSite(data, locale) {
  const prefix = locale && locale !== BLOG.LANG ? `/${locale}` : ''
  const paths = [
    '/',
    '/archive',
    '/category',
    '/tag',
    '/search',
    '/series',
    '/library',
    '/admin'
  ]
  const size = Number(
    data.NOTION_CONFIG?.POSTS_PER_PAGE || BLOG.POSTS_PER_PAGE || 12
  )
  const perPage = Number.isFinite(size) && size > 0 ? size : 12
  const paginate = (base, count) => {
    for (let page = 1; page <= Math.ceil(count / perPage); page++)
      paths.push(`${base}/page/${page}`)
  }
  for (const page of data.allPages || [])
    if (['Post', 'Page'].includes(page.type) && !/^https?:/.test(page.slug))
      paths.push(`/${page.slug || page.id}`)
  for (const item of data.categoryOptions || []) {
    const base = `/category/${encodeURIComponent(item.name)}`
    paths.push(base)
    paginate(base, item.count || 0)
  }
  for (const item of data.tagOptions || []) {
    const base = `/tag/${encodeURIComponent(item.name)}`
    paths.push(base)
    paginate(base, item.count || 0)
  }
  paginate('', data.postCount || 0)
  return [...new Set(paths)].map(
    path => `${prefix}${path === '/' && prefix ? '' : path}`
  )
}
