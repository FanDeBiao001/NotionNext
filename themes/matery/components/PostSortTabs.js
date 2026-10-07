import { siteConfig } from '@/lib/config'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export const POST_SORT_DEFAULT = 'default'
export const POST_SORT_LATEST = 'latest'

export function getPostSortMode(router) {
  return router?.query?.sort === POST_SORT_LATEST
    ? POST_SORT_LATEST
    : POST_SORT_DEFAULT
}

/**
 * 保持排序状态、URL 参数与卡片位移动画同步。
 */
export function usePostSort(listRef) {
  const router = useRouter()
  const [sortMode, setSortMode] = useState(() => getPostSortMode(router))
  const previousPositions = useRef(null)

  useEffect(() => {
    if (!router.isReady) return
    setSortMode(getPostSortMode(router))
  }, [router.isReady, router.query.sort])

  useIsomorphicLayoutEffect(() => {
    const positions = previousPositions.current
    const list = listRef.current
    previousPositions.current = null

    if (
      !positions ||
      !list ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    list.querySelectorAll('[data-post-key]').forEach(element => {
      if (typeof element.animate !== 'function') return
      const previous = positions.get(element.dataset.postKey)
      if (!previous) {
        element.animate(
          [
            { opacity: 0, transform: 'translateY(12px) scale(.98)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
          ],
          { duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)' }
        )
        return
      }

      const current = element.getBoundingClientRect()
      const deltaX = previous.left - current.left
      const deltaY = previous.top - current.top
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' }
        ],
        { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' }
      )
    })
  }, [sortMode, listRef])

  const changeSortMode = useCallback(
    value => {
      if (value === sortMode) return

      const positions = new Map()
      listRef.current
        ?.querySelectorAll('[data-post-key]')
        .forEach(element => {
          positions.set(element.dataset.postKey, element.getBoundingClientRect())
        })
      previousPositions.current = positions
      setSortMode(value)

      const query = { ...router.query }
      if (value === POST_SORT_LATEST) {
        query.sort = POST_SORT_LATEST
      } else {
        delete query.sort
      }

      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
        scroll: false
      })
    },
    [listRef, router, sortMode]
  )

  return { sortMode, changeSortMode }
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
const PostSortTabs = ({ value, onChange }) => {
  const router = useRouter()
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

  return (
    <div className='flex items-center justify-center px-4 pb-2 pt-4 sm:justify-between'>
      <div className='hidden items-center gap-2 text-sm font-medium text-slate-200 sm:flex'>
        <span
          aria-hidden='true'
          className='h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50'
        />
        <span>{isChinese ? '全部文章' : 'All posts'}</span>
      </div>
      <div
        role='group'
        aria-label={isChinese ? '文章排序方式' : 'Post sorting'}
        className='relative grid w-full max-w-xs grid-cols-2 rounded-xl border border-white/10 bg-slate-900/60 p-1 shadow-sm shadow-black/10 backdrop-blur-xl sm:w-auto'>
        <span
          aria-hidden='true'
          className='pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-gradient-to-br from-indigo-500/90 to-indigo-700/90 shadow-sm shadow-indigo-950/30 ring-1 ring-white/10 transition-transform duration-300 ease-out'
          style={{
            width: 'calc(50% - 4px)',
            transform:
              value === POST_SORT_LATEST
                ? 'translateX(100%)'
                : 'translateX(0)'
          }}
        />
        {options.map(option => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type='button'
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`relative z-10 min-h-8 rounded-lg px-3 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 sm:px-4 ${
                selected
                  ? 'text-white'
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
