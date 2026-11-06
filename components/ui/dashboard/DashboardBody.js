import Link from 'next/link'
export default function DashboardBody() {
  return <div className='mx-auto max-w-2xl p-8'><h1 className='mb-4 text-2xl'>用户中心</h1><p>会员、充值和订单服务尚未开放。</p><Link href='/library' className='mr-6 mt-6 inline-block underline'>我的阅读</Link><Link href='/admin' className='underline'>站长管理</Link></div>
}
