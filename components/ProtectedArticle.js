import { useEffect, useState } from 'react'

export default function ProtectedArticle({ post, locale, onUnlock }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const staticExport = process.env.EXPORT === 'true'
  const request = async value => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: post.slug || post.id,
          locale,
          password: value
        })
      })
      const data = await response.json()
      if (!response.ok) {
        if (value) setMessage(data.message || '无法解锁文章。')
        return
      }
      setPassword('')
      onUnlock(data.post)
    } catch {
      setMessage('网络请求失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (!staticExport) void request(undefined)
  }, [post.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className='relative mx-auto my-24 w-11/12 max-w-lg rounded-lg bg-white/95 p-6 text-slate-900 shadow-sm dark:bg-slate-900/95 dark:text-slate-100'>
      <h1 className='mb-4 text-2xl font-semibold'>{post.title}</h1>
      <p className='mb-6'>
        {staticExport
          ? '当前站点为静态导出，无法验证文章密码。请联系站长访问原文。'
          : '这篇文章需要密码访问。'}
      </p>
      {!staticExport && (
        <form
          onSubmit={e => {
            e.preventDefault()
            void request(password)
          }}
        >
          <label htmlFor='article-password' className='block mb-2'>
            文章密码
          </label>
          <div className='flex gap-2'>
            <input
              id='article-password'
              aria-describedby='article-password-error'
              aria-invalid={Boolean(message)}
              type='password'
              autoComplete='current-password'
              required
              maxLength={1024}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='min-w-0 flex-1 rounded border p-3 text-black'
            />
            <button
              type='submit'
              disabled={busy}
              className='rounded bg-indigo-700 px-4 py-3 text-white disabled:opacity-50'
            >
              {busy ? '验证中…' : '解锁'}
            </button>
          </div>
          <p id='article-password-error' role='status' className='mt-3'>
            {message}
          </p>
        </form>
      )}
    </section>
  )
}
