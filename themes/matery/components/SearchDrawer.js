import { Router } from 'next/router'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import SearchInput from './SearchInput'

const SearchDrawer = ({ cRef, slot }) => {
  const searchInputRef = useRef()
  const [isOpen, setIsOpen] = useState(false)

  useImperativeHandle(cRef, () => ({
    show: () => setIsOpen(true)
  }))

  useEffect(() => {
    if (!isOpen) return

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 60)
    const handleKeyDown = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    const closeSearch = () => setIsOpen(false)
    Router.events.on('routeChangeComplete', closeSearch)
    return () => Router.events.off('routeChangeComplete', closeSearch)
  }, [])

  if (!isOpen) return null

  return (
    <div id='search-drawer-wrapper'>
      <div className='fixed px-4 w-full left-0 top-16 z-[90] justify-center'>
        <div className='md:max-w-3xl max-h-[calc(100vh-6rem)] overflow-y-auto w-full mx-auto p-4 md:p-6 rounded-3xl border border-white/15 bg-slate-950/70 backdrop-blur-2xl shadow-2xl shadow-black/50 animate__animated animate__faster animate__fadeInDown'>
          <SearchInput cRef={searchInputRef} />
          {slot}
        </div>
      </div>

      <div
        id='search-drawer-background'
        role='presentation'
        onClick={() => setIsOpen(false)}
        className='animate__animated animate__faster animate__fadeIn fixed bg-black/55 backdrop-blur-md top-0 left-0 z-[80] w-full h-full'
      />
    </div>
  )
}

export default SearchDrawer
