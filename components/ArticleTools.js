import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { readLibrary, saveReading } from '@/lib/content/reading'

export default function ArticleTools({ post }) {
  const router = useRouter()
  const path = router.asPath?.split(/[?#]/)[0] || `/${post.slug}`
  const [saved, setSaved] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (post.password) return
    const old = readLibrary().find(item => item.path === path)
    setSaved(Boolean(old?.saved))
    setProgress(old?.progress || 0)
    const entry = { path, title: post.title }
    saveReading(entry)
    let timer
    const persist = () => {
      const root = document.getElementById('notion-article')
      if (!root) return
      const start = root.getBoundingClientRect().top + window.scrollY
      const length = Math.max(1, root.scrollHeight - window.innerHeight)
      saveReading({
        ...entry,
        progress: Math.min(1, Math.max(0, (window.scrollY - start) / length))
      })
    }
    const scroll = () => {
      clearTimeout(timer)
      timer = setTimeout(persist, 400)
    }
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', scroll)
    }
  }, [path, post.title, post.password])
  const resume = () => {
    const root = document.getElementById('notion-article')
    if (root)
      window.scrollTo({
        top:
          root.getBoundingClientRect().top +
          window.scrollY +
          progress * Math.max(1, root.scrollHeight - window.innerHeight),
        behavior: 'auto'
      })
  }
  return (
    <aside
      aria-label='阅读工具'
      className='mb-6 space-y-4 border-b pb-5 text-sm text-slate-700 dark:text-slate-200'
    >
      {!post.password && (
        <div className='flex flex-wrap items-center gap-4'>
          <button
            type='button'
            aria-pressed={saved}
            onClick={() => {
              if (saveReading({ path, title: post.title, saved: !saved }))
                setSaved(!saved)
              else setMessage('浏览器无法保存记录，请检查存储设置。')
            }}
            className='rounded border px-3 py-2'
          >
            {saved ? '已收藏' : '收藏文章'}
          </button>
          {progress > 0.02 && progress < 0.98 && (
            <button type='button' className='underline' onClick={resume}>
              继续阅读（{Math.round(progress * 100)}%）
            </button>
          )}
          <Link className='underline' href='/library'>
            我的阅读记录
          </Link>
          <span role='status'>{message}</span>
        </div>
      )}
      {post.seriesCollection && (
        <details>
          <summary className='cursor-pointer py-2'>
            系列：{post.seriesCollection.name}
          </summary>
          <ol className='list-decimal pl-6 space-y-2'>
            {post.seriesCollection.posts.map(item => (
              <li key={item.id}>
                <Link
                  aria-current={item.id === post.id ? 'page' : undefined}
                  className='underline'
                  href={`/${item.slug}`}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
        </details>
      )}
      {post.translations?.length > 0 && (
        <nav aria-label='文章语言' className='flex flex-wrap gap-4'>
          {post.translations.map(item => (
            <Link
              key={item.locale}
              locale={item.locale}
              href={`/${item.slug}`}
              className='underline'
            >
              {item.locale}
              {item.pending ? '（译文待更新）' : ''}
            </Link>
          ))}
        </nav>
      )}
    </aside>
  )
}
