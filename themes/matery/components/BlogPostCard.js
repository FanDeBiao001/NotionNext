import LazyImage from '@/components/LazyImage'
import NotionIcon from '@/components/NotionIcon'
import TwikooCommentCount from '@/components/TwikooCommentCount'
import { siteConfig } from '@/lib/config'
import { formatDateFmt } from '@/lib/utils/formatDate'
import SmartLink from '@/components/SmartLink'
import CONFIG from '../config'
import TagItemMini from './TagItemMini'

/**
 * 博客列表：文章卡牌
 * @param {*} param0
 * @returns
 */
const BlogPostCard = ({ index, post, showSummary, siteInfo }) => {
  const showPreview =
    siteConfig('MATERY_POST_LIST_PREVIEW', null, CONFIG) && post.blockMap
  // matery 主题默认强制显示图片
  if (post && !post.pageCoverThumbnail) {
    post.pageCoverThumbnail = siteInfo?.pageCover
  }
  const showPageCover =
    siteConfig('MATERY_POST_LIST_COVER', null, CONFIG) &&
    post?.pageCoverThumbnail
  const delay = (index % 3) * 300
  const visibleTags = post?.tagItems?.slice(0, 2) || []
  const hiddenTagCount = Math.max(
    (post?.tagItems?.length || 0) - visibleTags.length,
    0
  )

  return (
    <article
      data-aos='zoom-in'
      data-aos-duration='500'
      data-aos-delay={delay}
      data-aos-once='true'
      data-aos-anchor-placement='top-bottom'
      className='mb-2 h-full w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 text-slate-100 shadow-xl shadow-black/20 transition-colors hover:border-indigo-300/40 md:mb-4'
    >
      <header className='group flex h-full flex-col'>
        {/* 头部图片 填充卡片 */}
        {showPageCover && (
          <SmartLink href={post?.href} passHref legacyBehavior>
            <div className='relative flex h-48 w-full flex-none cursor-pointer transform overflow-hidden duration-200 sm:h-52 lg:h-56'>
              <LazyImage
                src={post?.pageCoverThumbnail}
                alt={post.title}
                className='h-full w-full group-hover:scale-110 group-hover:brightness-75 transform object-cover duration-500'
              />
              <h2 className='replace shadow-text absolute bottom-0 left-0 z-30 w-full break-words p-4 text-xl text-white md:p-5 md:text-2xl'>
                {siteConfig('POST_TITLE_ICON') && (
                  <NotionIcon icon={post.pageIcon} />
                )}
                {post.title}
              </h2>
              {/* 放在图片的阴影遮罩，便于突出文字 */}
              <div className='h-1/2 w-full absolute left-0 bottom-0 z-20 opacity-75 transition-all duration-200'>
                <div className='h-full w-full absolute bg-gradient-to-b from-transparent to-black'></div>
              </div>
            </div>
          </SmartLink>
        )}

        {/* 文字描述 */}
        <div className='flex flex-1 flex-col justify-between'>
          {/* 描述 */}
          <div className='px-4 flex flex-col w-full text-slate-200'>
            {(!showPreview || showSummary) && post.summary && (
              <p className='replace my-2 line-clamp-2 text-sm font-light leading-6 md:line-clamp-3 md:leading-7'>
                {post.summary}
              </p>
            )}

            <div className='my-2 flex items-center justify-between gap-2 text-slate-300'>
              <div>
                <SmartLink
                  href={`/archive#${formatDateFmt(post?.publishDate, 'yyyy-MM')}`}
                  passHref
                  className='mr-2 cursor-pointer whitespace-nowrap text-xs font-light leading-4 hover:underline sm:text-sm'
                >
                  <i className='far fa-clock mr-1' />
                  {post.date?.start_date || post.lastEditedDay}
                </SmartLink>
                <TwikooCommentCount
                  post={post}
                  className='hover:underline cursor-pointer text-sm'
                />
              </div>
              <SmartLink
                href={`/category/${post.category}`}
                passHref
                className='max-w-[45%] transform truncate cursor-pointer text-xs font-light hover:text-indigo-300 hover:underline sm:text-sm'
              >
                <i className='mr-1 far fa-folder' />
                {post.category}
              </SmartLink>
            </div>
          </div>

          {post?.tagItems && post?.tagItems.length > 0 && (
            <>
              <hr className='border-white/10' />
              <div className='text-slate-400 justify-between flex px-5 py-3'>
                <div className='md:flex-nowrap flex-wrap md:justify-start inline-block'>
                  <div>
                    {' '}
                    {visibleTags.map(tag => (
                      <TagItemMini key={tag.name} tag={tag} />
                    ))}
                    {hiddenTagCount > 0 && (
                      <span className='ml-1 inline-flex h-6 items-center rounded-full border border-white/10 px-2 text-xs text-slate-400'>
                        +{hiddenTagCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </header>
    </article>
  )
}

export default BlogPostCard
