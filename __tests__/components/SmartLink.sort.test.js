import SmartLink from '@/components/SmartLink'
import { render, screen } from '@testing-library/react'

jest.mock('@/lib/config', () => ({
  siteConfig: () => 'http://localhost'
}))

describe('SmartLink post sort isolation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?sort=latest')
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  test.each([
    ['/category/tech', '/category/tech'],
    ['/tag/react', '/tag/react'],
    ['/post-slug', '/post-slug'],
    ['/category/tech?sort=latest', '/category/tech']
  ])('keeps %s free of post sort', (href, expected) => {
    render(<SmartLink href={href}>Open</SmartLink>)
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      expected
    )
  })

  test('keeps latest on article list pagination', () => {
    render(
      <SmartLink href={{ pathname: '/page/2', query: { sort: 'latest' } }}>
        Next
      </SmartLink>
    )
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/page/2?sort=latest'
    )
  })
})
