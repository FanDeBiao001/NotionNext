import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { getListByPage } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import CONFIG from '../config'
import BlogPostCard from './BlogPostCard'
import BlogPostListEmpty from './BlogPostListEmpty'
import PostSortTabs, {
  getPostSortMode,
  POST_SORT_LATEST,
  sortPostsByPublishDate
} from './PostSortTabs'

/**
 * 博客列表滚动分页
 * @param posts 所有文章
 * @param tags 所有标签
 * @returns {JSX.Element}
 * @constructor
 */
const BlogPostListScroll = ({
  posts = [],
  currentSearch,
  showSummary = siteConfig('MATERY_POST_LIST_SUMMARY', null, CONFIG),
  siteInfo
}) => {
  const { NOTION_CONFIG } = useGlobal()
  const router = useRouter()
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', null, NOTION_CONFIG)
  const [page, updatePage] = useState(1)
  const pageSize = Number(POSTS_PER_PAGE) || 10
  const isHomePostList = router.pathname === '/'
  const sortMode = getPostSortMode(router)
  const orderedPosts =
    isHomePostList && sortMode === POST_SORT_LATEST
      ? sortPostsByPublishDate(posts)
      : posts
  const postsToShow = getListByPage(orderedPosts, page, pageSize)
  const loadMoreRef = useRef(null)
  const { locale } = useGlobal()
  const totalPages = Math.ceil(orderedPosts.length / pageSize)
  const hasMore = page < totalPages

  const handleGetMore = useCallback(() => {
    updatePage(currentPage => Math.min(currentPage + 1, totalPages))
  }, [totalPages])

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current || !window.IntersectionObserver) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) handleGetMore()
    }, { rootMargin: '0px 0px 200px 0px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, handleGetMore, page])

  useEffect(() => {
    updatePage(1)
  }, [sortMode])

  if (!postsToShow || postsToShow.length === 0) {
    return <BlogPostListEmpty currentSearch={currentSearch} />
  } else {
    return (
      <div id='container' className='w-full'>
        {isHomePostList && (
          <div id='posts-wrapper' className='scroll-mt-20'>
            <PostSortTabs />
          </div>
        )}
        {/* 文章列表 */}
        <div className='pt-4 flex flex-wrap pb-12'>
          {postsToShow.map((post, index) => (
            <div
              key={post.id || post.short_id || post.href}
              className='xl:w-1/3 md:w-1/2 w-full p-4'>
              <BlogPostCard
                index={index}
                post={post}
                siteInfo={siteInfo}
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <div className='my-4 text-center'>
            <button
              ref={loadMoreRef}
              type='button'
              onClick={handleGetMore}
              className='rounded-full border border-white/20 bg-slate-900/80 px-6 py-3 text-slate-100 transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'>
              {locale.COMMON.MORE}
            </button>
          </div>
        )}
      </div>
    )
  }
}

export default BlogPostListScroll
