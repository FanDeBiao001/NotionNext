import ReaderPage from '@/components/ReaderPage'
import Link from 'next/link'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { collectSeries } from '@/lib/content/collections'
import { sanitizeClientProps } from '@/lib/utils/publicData'
export default function Series({ series = [] }) {
  return (
    <ReaderPage>
      <h1 className='mb-6 text-3xl font-semibold'>系列文章</h1>
      {!series.length && (
        <p>
          暂无系列文章，可先浏览
          <Link href='/archive' className='underline'>
            全部文章
          </Link>
          。
        </p>
      )}
      {series.map(group => (
        <section key={group.name} className='mb-8 border-b pb-6'>
          <h2 className='text-xl font-semibold'>{group.name}</h2>
          <p className='my-3'>{group.description}</p>
          <ol className='list-decimal space-y-3 pl-6'>
            {group.posts.map(post => (
              <li key={post.id}>
                <Link className='underline' href={`/${post.slug}`}>
                  {post.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </ReaderPage>
  )
}
export async function getStaticProps({ locale }) {
  const data = await fetchGlobalAllData({ from: 'series', locale })
  return {
    props: {
      ...sanitizeClientProps(data),
      series: collectSeries(data.allPages)
    },
    revalidate: process.env.EXPORT ? undefined : 300
  }
}
