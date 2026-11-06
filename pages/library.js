import ReaderPage from '@/components/ReaderPage'
import { readerPageProps } from '@/lib/server/readerPageProps'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readLibrary, clearLibrary } from '@/lib/content/reading'
export default function Library() {
  const [entries, setEntries] = useState([])
  const [onlySaved, setOnlySaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const refresh = () => setEntries(readLibrary())
    refresh()
    window.addEventListener('notionnext:reading', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('notionnext:reading', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const visible = entries.filter(entry => !onlySaved || entry.saved)
  return (
    <ReaderPage>
      <h1 className='text-3xl font-semibold'>我的阅读</h1>
      <p className='my-4'>收藏和阅读进度保存在当前浏览器中。</p>
      <div className='mb-6 flex flex-wrap gap-6'>
        <label>
          <input
            type='checkbox'
            checked={onlySaved}
            onChange={e => setOnlySaved(e.target.checked)}
          />{' '}
          只看收藏
        </label>
        <button className='underline' onClick={() => setConfirmClear(true)}>
          清空记录
        </button>
        {confirmClear && (
          <span>
            清空后无法恢复。
            <button
              className='mx-3 underline'
              onClick={() => {
                setMessage(
                  clearLibrary() ? '' : '无法清空记录，请检查浏览器存储设置。'
                )
                setConfirmClear(false)
              }}
            >
              确认清空
            </button>
            <button
              className='underline'
              onClick={() => setConfirmClear(false)}
            >
              取消
            </button>
          </span>
        )}
      </div>
      <p role='status'>{message}</p>
      <ul aria-label='阅读记录' className='space-y-5'>
        {visible.map(entry => (
          <li key={entry.path} className='border-b pb-4'>
            <Link href={entry.path} className='text-lg underline'>
              {entry.title}
            </Link>
            <p className='mt-2'>
              {entry.saved ? '已收藏 · ' : ''}已读{' '}
              {Math.round((entry.progress || 0) * 100)}%
            </p>
          </li>
        ))}
      </ul>
      {!visible.length && (
        <p role='status'>
          还没有记录。
          <Link className='underline' href='/archive'>
            去看看文章
          </Link>
        </p>
      )}
    </ReaderPage>
  )
}

export const getStaticProps = readerPageProps
