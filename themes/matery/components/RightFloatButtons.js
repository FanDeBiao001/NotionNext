import JumpToTopButton from './JumpToTopButton'
import SocialButton from './SocialButton'

/**
 * 右下角悬浮按钮
 * @param {*} param0
 * @returns
 */
export default function RightFloatButtons(props) {
  const { floatRightBottom } = props
  return (
    <div className='matery-home-float-buttons fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 z-20 flex items-center justify-end gap-2 md:bottom-40 md:right-2 md:flex-col md:space-y-2'>
      <JumpToTopButton />
      <div className='hidden md:block'>
        <SocialButton />
      </div>
      {/* 可扩展的右下角悬浮 */}
      <div className='hidden md:block'>{floatRightBottom}</div>
    </div>
  )
}
