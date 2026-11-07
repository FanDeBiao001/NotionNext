import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  clearSearchHistory,
  readSearchHistory,
  saveSearchHistory
} from '@/lib/content/searchHistory'
import SearchInput from './SearchInput'

const SearchDrawer = ({ cRef, slot, posts = [] }) => {
  const searchInputRef = useRef(null)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const router = useRouter()
  const recommended = posts
    .filter(
      post =>
        post?.title &&
        !post.password &&
        post.status === 'Published' &&
        post.type === 'Post' &&
        typeof post.slug === 'string' &&
        !/^https?:/i.test(post.slug)
    )
    .slice(0, 3)

  useImperativeHandle(cRef, () => ({
    show: () => {
      triggerRef.current = document.activeElement
      setHistory(readSearchHistory())
      setMessage('')
      setIsOpen(true)
    }
  }))

  useEffect(() => {
    if (!isOpen) return
    const focusTimer = window.setTimeout(
      () => searchInputRef.current?.focus(),
      60
    )
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled])'
        ) || []
      ).filter(el => el.getClientRects().length)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      if (triggerRef.current?.isConnected) triggerRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const closeSearch = () => setIsOpen(false)
    router.events.on('routeChangeComplete', closeSearch)
    return () => router.events.off('routeChangeComplete', closeSearch)
  }, [router.events])

  const repeatSearch = term => {
    setHistory(saveSearchHistory(term))
    void router.push({ pathname: '/search', query: { s: term } })
  }

  if (!isOpen) return null
  return (
    <div id='search-drawer-wrapper'>
      <div className='fixed inset-x-0 top-16 z-[90] px-4'>
        <div
          ref={dialogRef}
          role='dialog'
          aria-modal='true'
          aria-label='搜索文章'
          className='mx-auto max-h-[calc(100dvh-5rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-slate-950/95 p-5 text-slate-100 shadow-2xl shadow-black/60 backdrop-blur-2xl md:p-7'
        >
          <div className='mb-5 flex items-start justify-between gap-4'>
            <div>
              <h2 className='text-lg font-semibold text-white'>搜索文章</h2>
              <p className='mt-1 text-sm text-slate-400'>
                搜索标题、摘要和正文，发现更多内容。
              </p>
            </div>
            <button
              type='button'
              aria-label='关闭搜索'
              onClick={() => setIsOpen(false)}
              className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
            >
              <i aria-hidden='true' className='fas fa-times' />
            </button>
          </div>
          <SearchInput cRef={searchInputRef} onSearch={setHistory} />
          {history.length > 0 && (
            <section aria-labelledby='search-history-title' className='mt-7'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3
                  id='search-history-title'
                  className='text-sm font-medium text-slate-300'
                >
                  最近搜索
                </h3>
                <button
                  type='button'
                  onClick={() => {
                    if (clearSearchHistory()) {
                      setHistory([])
                      setMessage('搜索历史已清空')
                    } else setMessage('无法清空搜索历史，请检查浏览器设置')
                  }}
                  className='rounded px-1 py-1 text-xs text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
                >
                  清空
                </button>
              </div>
              <ul className='flex flex-wrap gap-2'>
                {history.map(term => (
                  <li key={term}>
                    <button
                      type='button'
                      onClick={() => repeatSearch(term)}
                      className='max-w-full rounded-full bg-white/5 px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
                    >
                      <span className='block max-w-[16rem] truncate'>
                        {term}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p role='status' className='sr-only'>
            {message}
          </p>
          {recommended.length > 0 && (
            <section
              aria-labelledby='search-recommended-title'
              className='mt-8'
            >
              <div className='mb-3 flex items-baseline justify-between gap-3'>
                <h3
                  id='search-recommended-title'
                  className='text-sm font-medium text-slate-300'
                >
                  最近发布
                </h3>
                <Link
                  href='/archive'
                  className='text-xs text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
                >
                  查看全部 <span aria-hidden='true'>→</span>
                </Link>
              </div>
              <ul className='grid gap-2 sm:grid-cols-3'>
                {recommended.map(post => (
                  <li key={post.id}>
                    <Link
                      href={`/${post.slug}`}
                      className='group flex h-full min-h-24 flex-col justify-between rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
                    >
                      <span className='line-clamp-2 text-sm font-medium leading-6 text-slate-100 group-hover:text-indigo-200'>
                        {post.title}
                      </span>
                      <span className='mt-3 truncate text-xs text-slate-400'>
                        {post.category || post.publishDay || '文章'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {slot}
        </div>
      </div>
      <div
        id='search-drawer-background'
        aria-hidden='true'
        onClick={() => setIsOpen(false)}
        className='fixed inset-0 z-[80] bg-black/55 backdrop-blur-md'
      />
    </div>
  )
}
export default SearchDrawer
