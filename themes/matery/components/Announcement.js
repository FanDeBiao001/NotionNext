import { useGlobal } from '@/lib/global'
import dynamic from 'next/dynamic'

const NotionPage = dynamic(() => import('@/components/NotionPage'))

const Announcement = ({ notice }) => {
  const { locale } = useGlobal()
  if (!notice || Object.keys(notice).length === 0) {
    return <></>
  }
  return <div className='px-3 w-full'>
    <div
      data-aos='zoom-in'
      data-aos-duration='500'
      data-aos-once='true'
      data-aos-anchor-placement='top-bottom'
      style={{
        background:
          'linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(15, 23, 42, 0.24) 48%, rgba(56, 189, 248, 0.09))',
        backdropFilter: 'blur(20px) saturate(145%)',
        WebkitBackdropFilter: 'blur(20px) saturate(145%)',
        boxShadow:
          '0 14px 40px rgba(2, 6, 23, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)'
      }}
      className='mb-4 p-2 overflow-auto rounded-xl border border-white/25 ring-1 ring-indigo-300/10'>
      <div className='text-sm flex flex-nowrap justify-between'>
        <div className='font-light text-gray-100 drop-shadow-sm'>
          <i className='mx-2 fas fa-bullhorn' />{locale.COMMON.ANNOUNCEMENT}
        </div>
      </div>
      {notice && (<div id='announcement-content'>
        <NotionPage post={notice} className='text-center ' />
      </div>)}
    </div>
  </div>
}
export default Announcement
