import Link from 'next/link'

/** Shared readable surface for tools inside any theme layout. */
export default function ReaderPage({ children }) {
  return (
    <section className='relative mx-auto my-24 w-11/12 min-w-0 max-w-3xl rounded-lg bg-white/95 p-6 text-slate-900 shadow-sm dark:bg-slate-900/95 dark:text-slate-100 sm:p-8'>
      <nav aria-label='阅读导航' className='mb-8 flex flex-wrap gap-5 text-sm'>
        <Link className='underline underline-offset-4' href='/search'>
          搜索文章
        </Link>
        <Link className='underline underline-offset-4' href='/series'>
          系列文章
        </Link>
        <Link className='underline underline-offset-4' href='/library'>
          我的阅读
        </Link>
      </nav>
      {children}
    </section>
  )
}
