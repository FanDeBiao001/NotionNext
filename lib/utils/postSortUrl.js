/** 排序参数只属于首页文章列表及其分页。 */
export const isPostListPath = pathname =>
  /^\/(?:page\/[1-9]\d*\/?)?$/.test(pathname || '')

export function stripPostSortFromNonListHref(href, siteUrl) {
  if (typeof href === 'string') {
    if (!href || href.startsWith('#')) return href

    try {
      const url = new URL(href, siteUrl)
      if (
        url.origin !== new URL(siteUrl).origin ||
        isPostListPath(url.pathname) ||
        !url.searchParams.has('sort')
      ) {
        return href
      }

      url.searchParams.delete('sort')
      const isAbsolute = /^https?:\/\//i.test(href)
      return isAbsolute
        ? url.toString()
        : `${url.pathname}${url.search}${url.hash}`
    } catch {
      return href
    }
  }

  if (!href || typeof href !== 'object' || isPostListPath(href.pathname)) {
    return href
  }

  if (!Object.prototype.hasOwnProperty.call(href.query || {}, 'sort')) {
    return href
  }

  const { sort, ...query } = href.query
  return { ...href, query }
}
