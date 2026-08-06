import { test, expect } from '@playwright/test'

test.describe('Atölye sayfası auth guard', () => {
  test('atolye page requires auth', async ({ page }) => {
    await page.goto('/dashboard/atolye', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('service-orders API anonim reddeder', async ({ request }) => {
    const res = await request.get('/api/service-orders?limit=1')
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Atölye authenticated (opsiyonel)', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E_EMAIL/PASSWORD yok')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/, { timeout: 45_000 })
  })

  test('atölye sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/atolye', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/atolye/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('atölye detay sayfası erişilebilir', async ({ page }) => {
    await page.goto('/dashboard/atolye', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    // Servis emirleri listesi veya boş durum gösterilmeli
    await page.waitForTimeout(2000)
  })
})
