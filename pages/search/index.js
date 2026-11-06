import ReaderPage from '@/components/ReaderPage'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { searchDocuments } from '@/lib/content/search'
import { searchPageProps } from '@/lib/server/contentIndex'

export default function Search({
  searchIndex = { documents: [], failures: [] },
  initialQuery = ''
}) {
  const router = useRouter()
  const initial =
    typeof router.query.s === 'string' ? router.query.s : initialQuery
  const [input, setInput] = useState(null)
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState(20)
  const query = input === null ? initial : input
  const categories = useMemo(
    () =>
      [...new Set(searchIndex.documents.flatMap(doc => doc.categories))].sort(),
    [searchIndex]
  )
  const results = useMemo(
    () => searchDocuments(searchIndex.documents, query, category),
    [searchIndex, query, category]
  )
  return (
    <ReaderPage>
      <h1 className='mb-6 text-3xl font-semibold'>搜索文章</h1>
      <form
        role='search'
        onSubmit={e => {
          e.preventDefault()
          setLimit(20)
          void router.replace(
            { pathname: '/search', query: { s: query } },
            undefined,
            { shallow: true }
          )
        }}
        className='flex flex-wrap gap-3'
      >
        <label className='flex-1 min-w-48'>
          关键词
          <input
            type='search'
            value={query}
            maxLength={200}
            onChange={e => {
              setInput(e.target.value)
              setLimit(20)
            }}
            className='mt-2 block w-full rounded border p-3 text-black'
          />
        </label>
        <label>
          分类
          <select
            value={category}
            onChange={e => {
              setCategory(e.target.value)
              setLimit(20)
            }}
            className='mt-2 block rounded border p-3 text-black'
          >
            <option value=''>全部分类</option>
            {categories.map(name => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <button className='self-end rounded bg-indigo-700 px-5 py-3 text-white'>
          搜索
        </button>
      </form>
      <p role='status' className='my-6'>
        {query.trim()
          ? `找到 ${results.length} 篇文章`
          : '输入关键词，搜索标题、摘要与正文。'}
      </p>
      {searchIndex.failures.length > 0 && (
        <p className='mb-4'>部分正文暂时未能同步，仍可按标题查找。</p>
      )}
      <ol className='space-y-6'>
        {results.slice(0, limit).map(doc => (
          <li key={doc.id} className='border-b pb-6'>
            <Link
              href={`/${doc.slug}`}
              className='text-xl font-semibold underline underline-offset-4'
            >
              {doc.title}
            </Link>
            <p className='mt-3 break-words opacity-80'>{doc.excerpt}</p>
          </li>
        ))}
      </ol>
      {query.trim() && results.length === 0 && (
        <p>试试更短的关键词，或切换到全部分类。</p>
      )}
      {results.length > limit && (
        <button
          className='mt-6 rounded border px-5 py-3'
          onClick={() => setLimit(limit + 20)}
        >
          显示更多
        </button>
      )}
    </ReaderPage>
  )
}
export async function getStaticProps({ locale }) {
  return {
    props: await searchPageProps(locale),
    revalidate: process.env.EXPORT ? undefined : 300
  }
}
