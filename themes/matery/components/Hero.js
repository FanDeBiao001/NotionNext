import HeroBackground from '@/components/HeroBackground'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import CONFIG from '../config'

let wrapperTop = 0

/**
 * 首页英雄区
 * 是一张大图，带个居中按钮
 * @returns 头图
 */
const Hero = props => {
  const typedElementRef = useRef(null)
  const typedInstanceRef = useRef(null)
  const { siteInfo } = props
  const { locale } = useGlobal()
  const greetingWordsConfig = siteConfig('GREETING_WORDS') || ''
  const GREETING_WORDS_TYPE_SPEED =
    Number(siteConfig('GREETING_WORDS_TYPE_SPEED')) || 200
  const GREETING_WORDS_BACK_SPEED =
    Number(siteConfig('GREETING_WORDS_BACK_SPEED')) || 100
  useEffect(() => {
    let cancelled = false
    updateHeaderHeight()
    loadExternalResource('/js/typed.min.js', 'js')
      .then(() => {
        const element = typedElementRef.current
        if (cancelled || !window.Typed || !element?.isConnected) return

        typedInstanceRef.current?.destroy()
        typedInstanceRef.current = new window.Typed(element, {
          strings: greetingWordsConfig.split(','),
          typeSpeed: GREETING_WORDS_TYPE_SPEED,
          backSpeed: GREETING_WORDS_BACK_SPEED,
          backDelay: 400,
          showCursor: true,
          smartBackspace: true
        })
      })
      .catch(error => {
        if (!cancelled) console.warn('[Hero] Typed.js 加载失败', error)
      })

    window.addEventListener('resize', updateHeaderHeight)
    return () => {
      cancelled = true
      typedInstanceRef.current?.destroy()
      typedInstanceRef.current = null
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [
    greetingWordsConfig,
    GREETING_WORDS_BACK_SPEED,
    GREETING_WORDS_TYPE_SPEED
  ])

  function updateHeaderHeight() {
    requestAnimationFrame(() => {
      const wrapperElement = document.getElementById('wrapper')
      wrapperTop = wrapperElement?.offsetTop
    })
  }

  return (
    <header
      id='header'
      style={{ zIndex: 1 }}
      className='relative h-[72svh] min-h-[32rem] w-full md:h-screen md:min-h-0'
    >
      <HeroBackground />
      <div className='text-white absolute flex flex-col h-full items-center justify-center w-full '>
        {/* 站点标题 */}
        <h1 className='text-4xl md:text-5xl shadow-text'>
          {siteConfig('TITLE') || siteInfo?.title}
        </h1>
        {/* 站点欢迎语 */}
        <div className='mt-2 h-10 items-center text-center text-base text-white shadow-text md:h-12 md:text-lg'>
          <span ref={typedElementRef} />
        </div>
        {/* 滚动按钮 */}
        <button
          type='button'
          onClick={() => {
            window.scrollTo({ top: wrapperTop, behavior: 'smooth' })
          }}
          className='mt-7 cursor-pointer flex min-h-11 items-center gap-3 rounded-full border-2 border-white/40 px-7 py-2.5 text-white/90 md:mt-12 md:px-8 md:py-3
            hover:bg-white hover:text-gray-800 hover:border-white hover:shadow-lg hover:-translate-y-0.5
            transition-all duration-300 z-40'
        >
          <span>
            {siteConfig('MATERY_SHOW_START_READING', null, CONFIG) &&
              locale.COMMON.START_READING}
          </span>
          <i className='fas fa-angle-double-down' />
        </button>
      </div>
    </header>
  )
}

export default Hero
