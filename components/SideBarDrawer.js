import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'

/**
 * 侧边栏抽屉面板，可以从侧面拉出
 * @returns {JSX.Element}
 * @constructor
 */
const SideBarDrawer = ({
  children,
  isOpen,
  onOpen,
  onClose,
  className,
  showOnPC = false
}) => {
  const router = useRouter()
  const drawerRef = useRef(null)
  const backdropPointerDownRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    const body = document.body
    const html = document.documentElement
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior
    const previousHtmlOverflow = html.style.overflow
    const previousHtmlOverscroll = html.style.overscrollBehavior

    const preventBackgroundScroll = event => {
      if (drawerRef.current?.contains(event.target)) return
      event.preventDefault()
    }

    document.addEventListener('touchmove', preventBackgroundScroll, {
      passive: false
    })
    document.addEventListener('wheel', preventBackgroundScroll, {
      passive: false
    })

    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'

    return () => {
      document.removeEventListener('touchmove', preventBackgroundScroll)
      document.removeEventListener('wheel', preventBackgroundScroll)
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
      html.style.overflow = previousHtmlOverflow
      html.style.overscrollBehavior = previousHtmlOverscroll
    }
  }, [isOpen])

  useEffect(() => {
    const sideBarDrawerRouteListener = () => {
      onClose && onClose()
    }
    router.events.on('routeChangeComplete', sideBarDrawerRouteListener)
    return () => {
      router.events.off('routeChangeComplete', sideBarDrawerRouteListener)
    }
  }, [onClose, router.events])

  // 点击按钮更改侧边抽屉状态
  const switchSideDrawerVisible = showStatus => {
    if (showStatus) {
      onOpen && onOpen()
    } else {
      onClose && onClose()
    }
  }

  return (
    <div
      id='sidebar-wrapper'
      className={`block ${showOnPC ? '' : 'lg:hidden'} top-0`}>
      <div
        id='sidebar-drawer'
        ref={drawerRef}
        aria-hidden={!isOpen}
        style={{
          WebkitOverflowScrolling: 'touch',
          WebkitTransform: isOpen
            ? 'translate3d(0, 0, 0)'
            : 'translate3d(-100%, 0, 0)',
          transform: isOpen
            ? 'translate3d(0, 0, 0)'
            : 'translate3d(-100%, 0, 0)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        className={`z-[70] ${className || ''} w-72 max-w-[80vw] transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] bg-slate-950/85 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-black/50 flex flex-col fixed h-full left-0 overflow-y-auto overscroll-contain touch-pan-y top-0 will-change-transform`}>
        {children}
      </div>

      {/* 背景蒙版 */}
      <div
        id='sidebar-drawer-background'
        role='presentation'
        onPointerDown={event => {
          backdropPointerDownRef.current = event.target === event.currentTarget
        }}
        onPointerUp={event => {
          const shouldClose =
            backdropPointerDownRef.current && event.target === event.currentTarget
          backdropPointerDownRef.current = false
          if (shouldClose) switchSideDrawerVisible(false)
        }}
        onPointerCancel={() => {
          backdropPointerDownRef.current = false
        }}
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        className='fixed top-0 left-0 z-[60] h-full w-full bg-black/65 overscroll-none touch-none transition-opacity duration-300 ease-out'
      />
    </div>
  )
}

export default SideBarDrawer
