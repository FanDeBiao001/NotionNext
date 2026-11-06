import ReaderPage from '@/components/ReaderPage'
import { readerPageProps } from '@/lib/server/readerPageProps'
import { useState } from 'react'
export default function Admin() {
  const [token, setToken] = useState('')
  const [path, setPath] = useState('/')
  const [data, setData] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async action => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(
        action === 'oauth'
          ? '/api/auth/start'
          : `/api/admin/content${['backup', 'links'].includes(action) ? `?action=${action}` : ''}`,
        {
          method: ['refresh', 'oauth'].includes(action) ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          ...(['refresh', 'oauth'].includes(action)
            ? { body: JSON.stringify({ path }) }
            : {})
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || '操作失败')
      if (action === 'oauth') {
        window.location.assign(result.url)
        return
      }
      if (action === 'backup') {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(result, null, 2)], {
            type: 'application/json'
          })
        )
        const link = document.createElement('a')
        link.href = url
        link.download = `notionnext-${new Date().toISOString().slice(0, 10)}.json`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setMessage(
          result.failures.length
            ? `已导出，${result.failures.length} 篇文章失败；请查看文件中的 failures 并重试。`
            : '备份已导出。受保护文章不包含在导出中。'
        )
      } else {
        setData(result)
        setMessage(result.message || '站点检查完成。')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <ReaderPage>
      <h1 className='text-3xl font-semibold'>站长管理</h1>
      <p className='my-4'>查看内容状态、刷新页面与导出备份。</p>
      <form
        onSubmit={e => {
          e.preventDefault()
          void run('status')
        }}
      >
        <label htmlFor='admin-token'>管理令牌</label>
        <input
          id='admin-token'
          type='password'
          autoComplete='off'
          required
          value={token}
          onChange={e => setToken(e.target.value)}
          className='my-2 block w-full rounded border p-3 text-black'
        />
        <p className='text-sm opacity-80'>
          使用服务端配置的 ADMIN_API_TOKEN。令牌仅保留在当前页面内存中。
        </p>
        <button
          disabled={busy}
          className='mt-4 rounded bg-indigo-700 px-4 py-3 text-white disabled:opacity-50'
        >
          检查站点
        </button>
      </form>
      <div className='my-6 space-y-3'>
        <label htmlFor='refresh-path'>要刷新的页面</label>
        <input
          id='refresh-path'
          value={path}
          onChange={e => setPath(e.target.value)}
          className='block w-full rounded border p-3 text-black'
        />
        <div className='flex flex-wrap gap-3'>
          {[
            ['refresh', '刷新页面'],
            ['backup', '导出备份'],
            ['links', '检查图片与链接'],
            ['oauth', '连接 Notion']
          ].map(([action, title]) => (
            <button
              key={action}
              disabled={busy || !token}
              onClick={() => void run(action)}
              className='rounded border px-4 py-3 disabled:opacity-50'
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      <p role='status'>{busy ? '正在处理…' : message}</p>
      {data?.posts != null && (
        <section className='my-6'>
          <h2 className='text-xl font-semibold'>内容状态</h2>
          <p className='mt-3'>
            {data.posts} 篇文章 · 检查于{' '}
            {new Date(data.checkedAt).toLocaleString()}
          </p>
          <p>
            最近内容更新：
            {data.latestContentUpdate
              ? new Date(data.latestContentUpdate).toLocaleString()
              : '未知'}
          </p>
          <p>
            缓存命中 {data.cache.hit} 次，未命中 {data.cache.miss} 次
          </p>
          <h2 className='my-4 text-xl font-semibold'>待检查内容</h2>
          {!data.issues.length && <p>未发现缺标题、缺摘要或重复路径问题。</p>}
          <ul className='space-y-2'>
            {data.issues.map((issue, i) => (
              <li key={i}>
                {issue.slug}：{issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data?.checked != null && (
        <p className='my-4'>
          已检查 {data.checked} / {data.total} 个地址。无法连接的地址标记为
          unknown，请人工复核。
        </p>
      )}
      {data?.results && (
        <ul className='mt-4'>
          {data.results.map(result => (
            <li key={result.path || result.url}>
              {result.path || result.url}：
              {result.status || (result.ok ? '已刷新' : '失败')}
            </li>
          ))}
        </ul>
      )}
    </ReaderPage>
  )
}

export const getStaticProps = readerPageProps
