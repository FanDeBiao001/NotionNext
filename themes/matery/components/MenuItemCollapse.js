import Collapse from '@/components/Collapse'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useState } from 'react'

/**
 * 折叠菜单
 * @param {*} param0
 * @returns
 */
export const MenuItemCollapse = ({ link }) => {
  const [show, changeShow] = useState(false)
  const hasSubMenu = link?.subMenus?.length > 0
  const router = useRouter()

  const [isOpen, changeIsOpen] = useState(false)

  const toggleShow = () => {
    changeShow(!show)
  }

  const toggleOpenSubMenu = () => {
    changeIsOpen(!isOpen)
  }

  if (!link || !link.show) {
    return null
  }

  const selected = router.pathname === link.href || router.asPath === link.href

  return (
    <div className='overflow-hidden rounded-xl border border-white/10 bg-black/25 backdrop-blur-md shadow-sm'>
      <div
        onClick={toggleShow}
        className={
          'py-3 px-4 duration-300 text-base justify-between hover:bg-white/10 hover:text-white cursor-pointer font-light flex flex-nowrap items-center ' +
          (selected
            ? 'bg-white/15 text-white '
            : 'text-gray-100')
        }>
        {!hasSubMenu && (
          <SmartLink href={link?.href} target={link?.target}>
            <div className='my-auto items-center justify-between flex '>
              {link.icon && (
                <i className={`${link.icon} w-4 mr-6 text-center`} />
              )}
              <div>{link.name}</div>
            </div>
            {link.slot}
          </SmartLink>
        )}

        {hasSubMenu && (
          <div
            onClick={hasSubMenu ? toggleOpenSubMenu : null}
            className='my-auto items-center w-full justify-between flex '>
            <div className=''>
              <i className={`${link.icon} w-4 mr-6 text-center`} />
              {link?.name}
            </div>
            <i
              className={`px-2 fas fa-chevron-left transition-all duration-200 ${isOpen ? '-rotate-90' : ''}`}></i>
          </div>
        )}
      </div>

      {/* 折叠子菜单 */}
      {hasSubMenu && (
        <Collapse isOpen={isOpen}>
          {link.subMenus.map((sLink, index) => {
            return (
              <div
                key={index}
                className='cursor-pointer whitespace-nowrap w-full font-extralight text-gray-200 text-left px-5 justify-start bg-black/25 backdrop-blur-md hover:bg-white/10 hover:text-white tracking-widest transition-all duration-200 border-t border-white/10 py-3 pr-6'>
                <SmartLink href={sLink.href} target={link?.target}>
                  <span className='text-sm'>
                    <i className={`${sLink.icon} w-4 mr-3 text-center`} />
                    {sLink.title}
                  </span>
                </SmartLink>
              </div>
            )
          })}
        </Collapse>
      )}
    </div>
  )
}
