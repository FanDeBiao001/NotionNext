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
            passHref
            legacyBehavior>
            <button
              rel='prev'
              className='block px-3.5 py-2 text-white bg-indigo-700 hover:border-black rounded-full duration-200'>
              <i className='fas fa-angle-left text-2xl' />
            </button>
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
            passHref
            legacyBehavior>
            <button
              rel='next'
              className='block px-4 py-2 text-white bg-indigo-700 hover:border-black rounded-full duration-200'>
              <i className='fas fa-angle-right text-2xl' />
            </button>
          </SmartLink>
        </div>
      )}
    </div>
  )
}

export default PaginationSimple
