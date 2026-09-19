import { useRouter } from 'next/router'
import { useImperativeHandle, useRef, useState } from 'react'
import { useGlobal } from '@/lib/global'
let lock = false

const SearchInput = props => {
  const { currentSearch, cRef, className } = props
  const [onLoading, setLoadingState] = useState(false)
  const router = useRouter()
  const searchInputRef = useRef()
  const { locale } = useGlobal()
  useImperativeHandle(cRef, () => {
    return {
      focus: () => {
        searchInputRef?.current?.focus()
      }
    }
  })

  const handleSearch = () => {
    const key = searchInputRef.current.value
    if (key && key !== '') {
      setLoadingState(true)
      router.push({ pathname: '/search/' + key }).then(r => {
        setLoadingState(false)
      })
      // location.href = '/search/' + key
    } else {
      router.push({ pathname: '/' }).then(r => {})
    }
  }
  const handleKeyUp = e => {
    if (e.keyCode === 13) {
      // 回车
      handleSearch(searchInputRef.current.value)
    } else if (e.keyCode === 27) {
      // ESC
      cleanSearch()
    }
  }
  const cleanSearch = () => {
    searchInputRef.current.value = ''
    setShowClean(false)
    searchInputRef.current.focus()
  }

  const [showClean, setShowClean] = useState(false)
  const updateSearchKey = val => {
    if (lock) {
      return
    }
    searchInputRef.current.value = val

    if (val) {
      setShowClean(true)
    } else {
      setShowClean(false)
    }
  }
  function lockSearchInput() {
    lock = true
  }

  function unLockSearchInput() {
    lock = false
  }

  return (
    <div className={`relative flex w-full ${className || ''}`}>
      <input
        ref={searchInputRef}
        type='search'
        className='outline-none box-border w-full h-12 text-sm pl-5 pr-20 rounded-2xl border border-white/15 transition-all duration-200 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/20 text-gray-100 placeholder:text-gray-400 font-light bg-black/30 backdrop-blur-xl shadow-inner'
        onKeyUp={handleKeyUp}
        onCompositionStart={lockSearchInput}
        onCompositionUpdate={lockSearchInput}
        onCompositionEnd={unLockSearchInput}
        placeholder={locale.SEARCH.ARTICLES}
        onChange={e => updateSearchKey(e.target.value)}
        defaultValue={currentSearch || ''}
      />

      <div className='absolute inset-y-0 right-3 flex items-center gap-1'>
        {showClean && (
          <button
            type='button'
            aria-label='清空搜索'
            className='w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10 duration-200'
            onClick={cleanSearch}>
            <i className='fas fa-times' />
          </button>
        )}
        <button
          type='button'
          aria-label='搜索文章'
          className='w-8 h-8 rounded-full text-gray-300 hover:text-white hover:bg-indigo-500/50 duration-200'
          onClick={handleSearch}>
          <i
            className={`fas ${
              onLoading ? 'fa-spinner animate-spin' : 'fa-search'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default SearchInput
