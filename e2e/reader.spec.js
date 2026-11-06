const { test, expect } = require('@playwright/test')

test('search filters full text without navigation errors', async ({ page }) => {
  await page.goto('/search')
  await page.getByRole('searchbox').fill('不存在的关键词-qa-092148')
  await expect(
    page.getByRole('status').filter({ hasText: '找到 0 篇文章' })
  ).toBeVisible()
  await page.getByRole('searchbox').fill('')
  await expect(
    page.getByText('输入关键词，搜索标题、摘要与正文。')
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(390)
})

test('library persists saved entries and supports confirmed clearing', async ({
  page
}) => {
  await page.goto('/library')
  await page.evaluate(() =>
    localStorage.setItem(
      'notionnext:reading:v1',
      JSON.stringify([
        {
          path: '/qa-reader',
          title: '回归测试文章',
          saved: true,
          progress: 0.45
        }
      ])
    )
  )
  await page.reload()
  await expect(page.getByRole('link', { name: '回归测试文章' })).toBeVisible()
  await expect(page.getByText('已收藏 · 已读 45%')).toBeVisible()
  await page.getByRole('button', { name: '清空记录', exact: true }).click()
  await page.getByRole('button', { name: '确认清空', exact: true }).click()
  await expect(page.getByRole('link', { name: '回归测试文章' })).toHaveCount(0)
})

test('owner UI displays authorization failure without leaking credentials', async ({
  page
}) => {
  await page.goto('/admin')
  await page.getByLabel('管理令牌').fill('invalid-test-token')
  await page.getByRole('button', { name: '检查站点' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /not configured|Unauthorized/ })
  ).toBeVisible()
  expect(page.url()).not.toContain('invalid-test-token')
})

test('unsafe proxy and unauthorized cache operations are rejected', async ({
  request
}) => {
  expect(
    (await request.get('/api/shimeji/proxy?url=http://127.0.0.1')).status()
  ).toBe(400)
  expect([401, 503]).toContain((await request.post('/api/cache')).status())
  expect([401, 503]).toContain((await request.post('/api/revalidate')).status())
})

test('themes hydrate once and remain stable across client navigation', async ({
  page
}) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/search')
  await page.getByRole('searchbox').fill('缓存')
  await expect(page.locator('[id^="theme-"]')).toHaveCount(1)
  await page
    .getByRole('navigation', { name: '阅读导航' })
    .getByRole('link', { name: '我的阅读' })
    .click()
  await expect(page.getByRole('heading', { name: '我的阅读' })).toBeVisible()
  await expect(page.locator('[id^="theme-"]')).toHaveCount(1)
  await page.goto('/library?theme=example')
  await expect(page.getByRole('heading', { name: '我的阅读' })).toBeVisible()
  await expect(page.locator('[id^="theme-"]')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('public article can be saved and opened from the reading library', async ({
  page
}) => {
  await page.goto('/search')
  const article = await page.evaluate(
    () => window.__NEXT_DATA__.props.pageProps.searchIndex.documents[0]
  )
  expect(article).toBeTruthy()
  await page.goto(`/${article.slug}`)
  await page.getByRole('button', { name: '收藏文章', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '已收藏', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: '我的阅读记录' }).click()
  await expect(
    page
      .getByRole('list', { name: '阅读记录' })
      .getByRole('link', { name: article.title, exact: true })
  ).toBeVisible()
})
