import LazyImage from '@/components/LazyImage'
import { MenuListSide } from './MenuListSide'
import { siteConfig } from '@/lib/config'

/**
 * 侧边抽屉
 * @param tags
 * @param currentTag
 * @returns {JSX.Element}
 * @constructor
 */
const SideBar = (props) => {
  const { siteInfo } = props

  return (
    <div id='side-bar' className='min-h-full text-white'>
      <div className='w-full border-b border-white/10 bg-black/20'>
        <div className='mx-5 pt-8 pb-5'>
          <LazyImage
            src={siteInfo?.icon}
            className='cursor-pointer rounded-full ring-1 ring-white/20 shadow-lg'
            width={80}
            height={80}
            alt={siteConfig('AUTHOR')}
          />
          <div className='text-white text-xl mt-3 font-medium tracking-wide'>
            {siteConfig('TITLE')}
          </div>
        </div>
      </div>
      <MenuListSide {...props} />
    </div>
  )
}

export default SideBar
