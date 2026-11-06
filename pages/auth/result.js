import { useRouter } from 'next/router'
import Link from 'next/link'
export default function AuthResult() {
  const { query } = useRouter()
  const messages = { connected: 'Notion 授权已安全保存。', cancelled: '已取消授权。', failed: '授权未完成，请从管理页重试。' }
  return <main className='mx-auto max-w-xl p-8'><h1 className='mb-4 text-2xl'>授权结果</h1><p role='status'>{messages[query.status] || '请从站长管理页开始授权。'}</p><Link className='mt-6 inline-block underline' href='/admin'>返回站长管理</Link></main>
}
