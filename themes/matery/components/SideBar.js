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
const SideBar = props => {
  const { siteInfo, onClose } = props

  return (
    <div id='side-bar' className='min-h-full text-white'>
      <div className='w-full border-b border-white/10 bg-black/20'>
        <div className='relative mx-5 pb-5 pt-8'>
          <button
            type='button'
            onClick={onClose}
            aria-label='关闭菜单'
            className='absolute right-0 top-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
          >
            <i aria-hidden='true' className='fas fa-times' />
          </button>
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
