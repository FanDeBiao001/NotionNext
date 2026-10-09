import SmartLink from '@/components/SmartLink'
import { useGlobal } from '@/lib/global'
import TagItemMiddle from './TagItemMiddle'
import { formatDateFmt } from '@/lib/utils/formatDate'
import WordCount from '@/components/WordCount'

export const ArticleInfo = props => {
  const { post } = props

  const { locale } = useGlobal()

  return (
    <section className='mb-3 dark:text-gray-200'>
      <div className='my-3'>
        {post.tagItems && (
          <div className='flex flex-nowrap overflow-x-auto'>
            {post.tagItems.map(tag => (
              <TagItemMiddle key={tag.name} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm md:mt-5'>
        {post?.type !== 'Page' && (
          <>
            <SmartLink
              href={`/archive#${formatDateFmt(post?.publishDate, 'yyyy-MM')}`}
              passHref
              className='cursor-pointer whitespace-nowrap'
            >
              <i className='far fa-calendar-minus fa-fw' />{' '}
              {locale.COMMON.POST_TIME}: {post?.publishDay}
            </SmartLink>
            <span className='hidden whitespace-nowrap md:inline'>
              <i className='far fa-calendar-check fa-fw' />
              {locale.COMMON.LAST_EDITED_TIME}: {post.lastEditedDay}
            </span>
            <span className='hidden busuanzi_container_page_pv font-light mr-2'>
              <i className='mr-1 fas fa-eye' />
              <span className='busuanzi_value_page_pv' />
            </span>
            <span className='hidden md:inline-flex'>
              <WordCount wordCount={post.wordCount} readTime={post.readTime} />
            </span>
            <span className='whitespace-nowrap md:hidden'>
              <i className='far fa-clock fa-fw' /> {post.readTime || 1} 分钟
            </span>
          </>
        )}
      </div>
    </section>
  )
}
