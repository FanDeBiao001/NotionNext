import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useMateryGlobal } from '..'

/**
 * 搜索按钮
 * @returns
 */
export default function SearchButton({ onSearch }) {
  const { locale } = useGlobal()
  const router = useRouter()
  const { searchModal } = useMateryGlobal()

  function handleSearch() {
    if (siteConfig('ALGOLIA_APP_ID')) {
      searchModal.current.openSearch()
    } else if (onSearch) {
      onSearch()
    } else {
      router.push('/search')
    }
  }

  return (
    <button
      type='button'
      onClick={handleSearch}
      title={locale.NAV.SEARCH}
      aria-label={locale.NAV.SEARCH}
      className='cursor-pointer dark:text-white hover:bg-black hover:bg-opacity-10 rounded-full w-11 h-11 flex justify-center items-center duration-200 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300'>
      <i aria-hidden='true' className='fa-solid fa-magnifying-glass' />
    </button>
  )
}
