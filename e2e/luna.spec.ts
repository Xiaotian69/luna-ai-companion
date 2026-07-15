import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.route('**/api/auth/session', (route) => route.fulfill({ json: { authenticated: true } }))
  await page.route('**/api/conversations', (route) => route.fulfill({ json: { conversations: [] } }))
  await page.goto('/')
  await expect(page.getByText('晚上好。')).toBeVisible()
  expect(errors).toEqual([])
})

test('renders the compact desktop chat experience', async ({ page }) => {
  await expect(page.getByLabel('主导航')).toBeVisible()
  await expect(page.getByLabel('消息')).toBeVisible()
  await page.getByLabel('打开历史').click()
  await expect(page.getByRole('heading', { name: '对话记录' })).toBeVisible()
})

test('keeps the mobile composer visible above the bottom navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  const composer = page.getByLabel('消息')
  const navigation = page.getByLabel('主导航')
  await expect(composer).toBeVisible()
  await expect(navigation).toBeVisible()
  expect((await composer.boundingBox())!.y).toBeLessThan((await navigation.boundingBox())!.y)
})
