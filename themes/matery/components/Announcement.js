import { useGlobal } from '@/lib/global'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const NotionPage = dynamic(() => import('@/components/NotionPage'))

const Announcement = ({ notice }) => {
  const { locale } = useGlobal()
  const [expanded, setExpanded] = useState(false)
  if (!notice || Object.keys(notice).length === 0) {
    return <></>
  }
  return (
    <div className='px-3 w-full'>
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
        className='mb-3 overflow-hidden rounded-xl border border-white/25 p-2 ring-1 ring-indigo-300/10 md:mb-4'
      >
        <div className='text-sm flex flex-nowrap justify-between'>
          <div className='font-light text-gray-100 drop-shadow-sm'>
            <i className='mx-2 fas fa-bullhorn' />
            {locale.COMMON.ANNOUNCEMENT}
          </div>
        </div>
        {notice && (
          <>
            <div
              id='announcement-content'
              className={`relative transition-[max-height] duration-300 md:max-h-none ${expanded ? 'max-h-[60vh] overflow-auto' : 'max-h-20 overflow-hidden'}`}
            >
              <NotionPage post={notice} className='text-center' />
              {!expanded && (
                <div className='pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/80 to-transparent md:hidden' />
              )}
            </div>
            <button
              type='button'
              aria-expanded={expanded}
              aria-controls='announcement-content'
              onClick={() => setExpanded(value => !value)}
              className='mx-auto mt-1 flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-medium text-indigo-200 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 md:hidden'
            >
              {expanded ? '收起公告' : '展开公告'}
              <i
                aria-hidden='true'
                className={`fas fa-chevron-down transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
export default Announcement
