import { siteConfig } from '@/lib/config'
import { useRouter } from 'next/router'

export const POST_SORT_DEFAULT = 'default'
export const POST_SORT_LATEST = 'latest'

export function getPostSortMode(router) {
  return router?.query?.sort === POST_SORT_LATEST
    ? POST_SORT_LATEST
    : POST_SORT_DEFAULT
}

export function sortPostsByPublishDate(posts = []) {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => {
      const timeA = getPublishTimestamp(a.post)
      const timeB = getPublishTimestamp(b.post)
      return timeB - timeA || a.index - b.index
    })
    .map(item => item.post)
}

function getPublishTimestamp(post) {
  const value =
    post?.publishDate || post?.date?.start_date || post?.lastEditedDate || 0
  const timestamp = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

/**
 * 首页文章排序切换器
 */
const PostSortTabs = () => {
  const router = useRouter()
  const sortMode = getPostSortMode(router)
  const language = router.locale || siteConfig('LANG', 'zh-CN')
  const isChinese = language.toLowerCase().startsWith('zh')
  const options = [
    {
      value: POST_SORT_DEFAULT,
      label: isChinese ? '默认排序' : 'Default'
    },
    {
      value: POST_SORT_LATEST,
      label: isChinese ? '最新发布' : 'Latest'
    }
  ]

  const handleChange = value => {
    if (value === sortMode) return

    const query = {}
    if (value === POST_SORT_LATEST) query.sort = POST_SORT_LATEST

    router.replace(
      {
        pathname: '/',
        query,
        hash: 'posts-wrapper'
      },
      undefined,
      { scroll: true }
    )
  }

  return (
    <div className='flex min-h-[4.5rem] items-center justify-center px-4'>
      <div
        role='group'
        aria-label={isChinese ? '文章排序方式' : 'Post sorting'}
        className='inline-flex rounded-xl border border-white/20 bg-slate-900/75 p-1 shadow-lg shadow-black/20 backdrop-blur-xl'>
        {options.map(option => {
          const selected = option.value === sortMode
          return (
            <button
              key={option.value}
              type='button'
              aria-pressed={selected}
              onClick={() => handleChange(option.value)}
              className={`min-h-[2.25rem] rounded-lg px-5 text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
                selected
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-950/40 ring-1 ring-white/15'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}>
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PostSortTabs
