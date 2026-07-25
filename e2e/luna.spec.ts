import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  let companion = {
    displayName: 'Luna',
    avatarUrl: '',
    relationshipPreset: 'friend',
    customRelationship: '',
    userAddress: '',
    personality: '温柔、聪明、自然',
    speakingStyle: '自然简短',
    boundaries: '不制造情感依赖',
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  }
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.route('**/api/auth/session', (route) => route.fulfill({ json: { authenticated: true } }))
  await page.route('**/api/conversations', (route) => route.fulfill({ json: { conversations: [] } }))
  await page.route('**/api/companion', async (route) => {
    if (route.request().method() === 'PUT') {
      companion = { ...companion, ...route.request().postDataJSON(), updatedAt: new Date().toISOString() }
    }
    await route.fulfill({ json: { companion } })
  })
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

test('saves a custom companion and uses the new identity in chat', async ({ page }, testInfo) => {
  await page.route('https://avatar.example.test/**', (route) => route.abort())
  await page.getByRole('link', { name: '我的 AI 伴侣' }).click()
  const name = page.getByLabel('名字')
  await expect(name).toHaveValue('Luna')
  await name.fill('Nova')
  await page.getByLabel('关系').selectOption('boyfriend')
  await page.getByLabel('头像 URL').fill('https://avatar.example.test/missing.png')
  await expect(page.getByLabel('头像预览')).toContainText('N')
  await page.getByRole('button', { name: '保存伴侣设定' }).click()
  await expect(page.getByText('已保存')).toBeVisible()

  await page.getByRole('link', { name: '聊天' }).click()

  await expect(page.getByRole('heading', { name: 'Nova' })).toBeVisible()
  await expect(page.getByPlaceholder('给 Nova 发消息…')).toBeVisible()
  const home = page.locator('[aria-label="Nova 首页"]')
  if (testInfo.project.name === 'mobile') await expect(home).toBeAttached()
  else await expect(home).toBeVisible()
})
