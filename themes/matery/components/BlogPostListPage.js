import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useRef } from 'react'
import BlogPostCard from './BlogPostCard'
import BlogPostListEmpty from './BlogPostListEmpty'
import PaginationSimple from './PaginationSimple'
import PostSortTabs, {
  POST_SORT_LATEST,
  sortPostsByPublishDate,
  usePostSort
} from './PostSortTabs'

/**
 * 文章列表分页表格
 * @param page 当前页
 * @param posts 所有文章
 * @param tags 所有标签
 * @returns {JSX.Element}
 * @constructor
 */
const BlogPostListPage = ({
  page = 1,
  posts = [],
  postCount,
  siteInfo,
  allNavPages = []
}) => {
  const { NOTION_CONFIG } = useGlobal()
  const router = useRouter()
  const postListRef = useRef(null)
  const { sortMode, changeSortMode } = usePostSort(postListRef)
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', null, NOTION_CONFIG)
  const totalPage = Math.ceil(postCount / POSTS_PER_PAGE)
  const showPagination = totalPage > 1
  const isHomePostList =
    router.pathname === '/' || router.pathname === '/page/[page]'
  const detailedPosts = new Map(
    posts.map(post => [post.href || post.slug, post])
  )
  const sortedPosts =
    isHomePostList && sortMode === POST_SORT_LATEST
      ? sortPostsByPublishDate(allNavPages.length > 0 ? allNavPages : posts)
          .slice(POSTS_PER_PAGE * (page - 1), POSTS_PER_PAGE * page)
          .map(post => ({
            ...post,
            ...(detailedPosts.get(post.href || post.slug) || {})
          }))
      : posts

  if (!sortedPosts || sortedPosts.length === 0 || page > totalPage) {
    return <BlogPostListEmpty />
  } else {
    return (
      <div id='posts-wrapper' className='w-full scroll-mt-20'>
        {isHomePostList ? (
          <PostSortTabs value={sortMode} onChange={changeSortMode} />
        ) : (
          <div className='pt-6' />
        )}
        {/* 文章列表 */}
        <div ref={postListRef} className='pt-2 flex flex-wrap pb-12'>
          {sortedPosts.map((post, index) => {
            const postKey = post.id || post.short_id || post.href
            return (
              <div
                key={postKey}
                data-post-key={postKey}
                className='xl:w-1/3 md:w-1/2 w-full p-4 will-change-transform'>
                <BlogPostCard index={index} post={post} siteInfo={siteInfo} />
              </div>
            )
          })}
        </div>
        {showPagination && (
          <PaginationSimple
            page={page}
            totalPage={totalPage}
            sortMode={sortMode}
          />
        )}
      </div>
    )
  }
}

export default BlogPostListPage
