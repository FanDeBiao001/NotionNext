import Head from 'next/head'
import HeroBackground from '@/components/HeroBackground'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useState } from 'react'
import CONFIG from '../config'

let wrapperTop = 0

/**
 * 首页英雄区
 * 是一张大图，带个居中按钮
 * @returns 头图
 */
const Hero = props => {
  const [typed, changeType] = useState()
  const { siteInfo } = props
  const { locale } = useGlobal()
  const GREETING_WORDS = siteConfig('GREETING_WORDS').split(',')
  const GREETING_WORDS_TYPE_SPEED = Number(siteConfig('GREETING_WORDS_TYPE_SPEED')) || 200
  const GREETING_WORDS_BACK_SPEED = Number(siteConfig('GREETING_WORDS_BACK_SPEED')) || 100
  useEffect(() => {
    updateHeaderHeight()
    if (!typed && window && document.getElementById('typed')) {
      loadExternalResource('/js/typed.min.js', 'js').then(() => {
        if (window.Typed) {
          changeType(
            new window.Typed('#typed', {
              strings: GREETING_WORDS,
              typeSpeed: GREETING_WORDS_TYPE_SPEED,
              backSpeed: GREETING_WORDS_BACK_SPEED,
              backDelay: 400,
              showCursor: true,
              smartBackspace: true
            })
          )
        }
      })
    }

    window.addEventListener('resize', updateHeaderHeight)
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

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
      className=' w-full h-screen relative'>
      <HeroBackground />
      <div className='text-white absolute flex flex-col h-full items-center justify-center w-full '>
        {/* 站点标题 */}
        <div className='text-4xl md:text-5xl shadow-text'>
          {siteConfig('TITLE') || siteInfo?.title}
        </div>
        {/* 站点欢迎语 */}
        <div className='mt-2 h-12 items-center text-center shadow-text text-white text-lg'>
          <span id='typed' />
        </div>
        {/* 滚动按钮 */}
        <div
          onClick={() => {
            window.scrollTo({ top: wrapperTop, behavior: 'smooth' })
          }}
          className='mt-12 cursor-pointer flex items-center gap-3 px-8 py-3 text-white/90 border-2 border-white/40 rounded-full
            hover:bg-white hover:text-gray-800 hover:border-white hover:shadow-lg hover:-translate-y-0.5
            transition-all duration-300 z-40'>
          <span>
            {siteConfig('MATERY_SHOW_START_READING', null, CONFIG) &&
              locale.COMMON.START_READING}
          </span>
          <i className='fas fa-angle-double-down' />
        </div>
      </div>

      <Head>
        {siteInfo?.pageCover && (
          <link rel='preload' href={siteInfo.pageCover} as='image' />
        )}
      </Head>
      <img
        id='header-cover'
        src={siteInfo?.pageCover}
        className={`header-cover object-center w-full h-screen object-cover hidden`}
      />
    </header>
  )
}

export default Hero
