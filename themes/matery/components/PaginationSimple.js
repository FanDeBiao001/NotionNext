import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'

/**
 * 简易翻页插件
 * @param page 当前页码
 * @param totalPage 总页数
 * @returns {JSX.Element}
 * @constructor
 */
const PaginationSimple = ({ page, totalPage }) => {
  const router = useRouter()
  const currentPage = +page
  const showPrevious = currentPage > 1
  const showNext = currentPage < totalPage
  const pagePrefix = router.asPath
    .split(/[?#]/)[0]
    .replace(/\/page\/[1-9]\d*/, '')
    .replace(/\/$/, '')
  return (
    <div className='my-10 mx-6 grid grid-cols-2 items-center font-medium text-black dark:text-gray-100'>
      {showPrevious && (
        <div className='justify-self-start'>
          <SmartLink
            href={{
              pathname:
                currentPage === 2
                  ? `${pagePrefix}/`
                  : `${pagePrefix}/page/${currentPage - 1}`,
              query: router.query.s ? { s: router.query.s } : {},
              hash: 'posts-wrapper'
            }}
            rel='prev'
            aria-label={`上一页，第 ${currentPage - 1} 页`}
            className='flex h-11 min-w-11 items-center justify-center rounded-full bg-indigo-700 px-3.5 text-white transition-colors hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300'>
            <i aria-hidden='true' className='fas fa-angle-left text-2xl' />
          </SmartLink>
        </div>
      )}

      {showNext && (
        <div className='col-start-2 justify-self-end'>
          <SmartLink
            href={{
              pathname: `${pagePrefix}/page/${currentPage + 1}`,
              query: router.query.s ? { s: router.query.s } : {},
              hash: 'posts-wrapper'
            }}
            rel='next'
            aria-label={`下一页，第 ${currentPage + 1} 页`}
            className='flex h-11 min-w-11 items-center justify-center rounded-full bg-indigo-700 px-4 text-white transition-colors hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300'>
            <i aria-hidden='true' className='fas fa-angle-right text-2xl' />
          </SmartLink>
        </div>
      )}
    </div>
  )
}

export default PaginationSimple
