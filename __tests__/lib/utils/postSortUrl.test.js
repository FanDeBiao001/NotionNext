import {
  isPostListPath,
  stripPostSortFromNonListHref
} from '@/lib/utils/postSortUrl'
import {
  getPostSortMode,
  POST_SORT_DEFAULT,
  POST_SORT_LATEST
} from '@/themes/matery/components/PostSortTabs'

const siteUrl = 'https://blog.example.com'

describe('post sort URL scope', () => {
  test('allows sort only on the home list and its pages', () => {
    expect(isPostListPath('/')).toBe(true)
    expect(isPostListPath('/page/2')).toBe(true)
    expect(isPostListPath('/page/2/')).toBe(true)
    expect(isPostListPath('/category/tech')).toBe(false)
    expect(isPostListPath('/tag/react')).toBe(false)
    expect(isPostListPath('/post-slug')).toBe(false)
  })

  test.each([
    ['/category/tech?sort=latest&theme=dark', '/category/tech?theme=dark'],
    ['/tag/react?sort=latest#posts', '/tag/react#posts'],
    ['/post-slug?sort=latest', '/post-slug'],
    [
      'https://blog.example.com/post-slug?sort=latest&theme=dark',
      'https://blog.example.com/post-slug?theme=dark'
    ]
  ])('removes sort from non-list link %s', (href, expected) => {
    expect(stripPostSortFromNonListHref(href, siteUrl)).toBe(expected)
  })

  test('preserves the list sort and external links', () => {
    expect(stripPostSortFromNonListHref('/?sort=latest', siteUrl)).toBe(
      '/?sort=latest'
    )
    expect(stripPostSortFromNonListHref('/page/2?sort=latest', siteUrl)).toBe(
      '/page/2?sort=latest'
    )
    expect(
      stripPostSortFromNonListHref(
        'https://other.example.com/article?sort=latest',
        siteUrl
      )
    ).toBe('https://other.example.com/article?sort=latest')
  })

  test('does not activate latest sort on category, tag or article routes', () => {
    for (const asPath of [
      '/category/tech?sort=latest',
      '/tag/react?sort=latest',
      '/post-slug?sort=latest'
    ]) {
      expect(getPostSortMode({ asPath, query: { sort: 'latest' } })).toBe(
        POST_SORT_DEFAULT
      )
    }
    expect(
      getPostSortMode({
        asPath: '/page/2?sort=latest',
        query: { sort: 'latest' }
      })
    ).toBe(POST_SORT_LATEST)
  })

  test('removes explicit sort from object links without mutating the input', () => {
    const href = {
      pathname: '/category/tech',
      query: { sort: 'latest', theme: 'dark' }
    }
    expect(stripPostSortFromNonListHref(href, siteUrl)).toEqual({
      pathname: '/category/tech',
      query: { theme: 'dark' }
    })
    expect(href.query.sort).toBe('latest')
    expect(
      stripPostSortFromNonListHref(
        { pathname: '/page/2', query: { sort: 'latest' } },
        siteUrl
      )
    ).toEqual({ pathname: '/page/2', query: { sort: 'latest' } })
  })
})
