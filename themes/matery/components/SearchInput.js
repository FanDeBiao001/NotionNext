import { useRouter } from 'next/router'
import { useImperativeHandle, useRef, useState } from 'react'
import { useGlobal } from '@/lib/global'
import { saveSearchHistory } from '@/lib/content/searchHistory'

const SearchInput = ({ currentSearch, cRef, className, onSearch }) => {
  const [value, setValue] = useState(currentSearch || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const composing = useRef(false)
  const inputRef = useRef(null)
  const router = useRouter()
  const { locale } = useGlobal()
  useImperativeHandle(cRef, () => ({ focus: () => inputRef.current?.focus() }))

  const handleSearch = async event => {
    event.preventDefault()
    const term = value.trim()
    if (!term || composing.current || loading) return
    onSearch?.(saveSearchHistory(term))
    setLoading(true)
    setError('')
    try {
      await router.push({ pathname: '/search', query: { s: term } })
    } catch {
      setError('搜索暂时不可用，请重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      role='search'
      onSubmit={event => {
        void handleSearch(event)
      }}
      className={`relative flex w-full ${className || ''}`}
    >
      <input
        ref={inputRef}
        type='search'
        aria-label={locale.SEARCH.ARTICLES}
        maxLength={200}
        value={value}
        onChange={event => setValue(event.target.value)}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={() => {
          composing.current = false
        }}
        placeholder={locale.SEARCH.ARTICLES}
        className='box-border h-14 w-full rounded-2xl border border-white/20 bg-slate-950/70 pl-5 pr-24 text-base text-slate-100 placeholder:text-slate-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30'
      />
      <div className='absolute inset-y-0 right-2 flex items-center gap-1'>
        {value && (
          <button
            type='button'
            aria-label='清空搜索'
            onClick={() => {
              setValue('')
              inputRef.current?.focus()
            }}
            className='flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'
          >
            <i aria-hidden='true' className='fas fa-times' />
          </button>
        )}
        <button
          type='submit'
          disabled={loading}
          aria-label='搜索文章'
          className='flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-indigo-500/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 disabled:opacity-50'
        >
          <i
            aria-hidden='true'
            className={`fas ${loading ? 'fa-spinner animate-spin' : 'fa-search'}`}
          />
        </button>
      </div>
      <span
        role='status'
        className='absolute left-1 top-full mt-1 text-xs text-rose-300'
      >
        {error}
      </span>
    </form>
  )
}
export default SearchInput
