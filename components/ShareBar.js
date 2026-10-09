import { siteConfig } from '@/lib/config'
import dynamic from 'next/dynamic'

const ShareButtons = dynamic(() => import('@/components/ShareButtons'), {
  ssr: false
})

/**
 * 分享栏
 * @param {} param0
 * @returns
 */
const ShareBar = ({ post, compact = false }) => {
  if (
    !JSON.parse(siteConfig('POST_SHARE_BAR_ENABLE')) ||
    !post ||
    post?.type !== 'Post'
  ) {
    return <></>
  }

  return (
    <div className='my-3 overflow-visible px-1'>
      <div className='flex w-full justify-center md:justify-end'>
        <ShareButtons post={post} compact={compact} />
      </div>
    </div>
  )
}
export default ShareBar
