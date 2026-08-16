import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import { siteConfig } from '@/lib/config'
import { useEffect, useRef, useState } from 'react'

/**
 * 跳转到网页顶部 — 滑出 Hero 后显示，回到顶部后隐藏
 */
const JumpToTopButton = ({ showPercent = true, percent }) => {
  const { locale } = useGlobal()
  const [visible, setVisible] = useState(false)
  const lastToggle = useRef(0)

  useEffect(() => {
    let timer = null
    const onScroll = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        const now = Date.now()
        if (now - lastToggle.current < 300) return

        const scrollY = window.scrollY
        const heroH = window.innerHeight
        const shouldShow = scrollY > heroH - 80

        setVisible(prev => {
          if (shouldShow !== prev) {
            lastToggle.current = now
            return shouldShow
          }
          return prev
        })
      }, 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [])

  if (!siteConfig('MATERY_WIDGET_TO_TOP', null, CONFIG)) {
    return <></>
  }

  if (!siteConfig('MATERY_WIDGET_TO_TOP', null, CONFIG)) {
    return <></>
  }

  return (
    <div
      className={`flex justify-center items-center text-center select-none transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <i
        title={locale.POST.TOP}
        className='fas fa-arrow-up transform hover:scale-105 duration-200 text-white bg-black w-10 h-10 rounded-full dark:bg-hexo-black-gray cursor-pointer flex justify-center items-center'
      />
    </div>
  )
}

export default JumpToTopButton
