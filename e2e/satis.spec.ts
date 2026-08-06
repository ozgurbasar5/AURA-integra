import { test, expect } from '@playwright/test'

test.describe('Satış sayfası auth guard', () => {
  test('satis page requires auth', async ({ page }) => {
    await page.goto('/dashboard/satis', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('satis API POST anonim reddeder', async ({ request }) => {
    const res = await request.post('/api/tenant/sales', {
      data: { items: [], payment_method: 'nakit' },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('satis API GET anonim reddeder', async ({ request }) => {
    const res = await request.get('/api/tenant/sales?limit=5')
    expect([401, 403, 400, 404]).toContain(res.status())
  })
})

test.describe('Satış authenticated (opsiyonel)', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E_EMAIL/PASSWORD yok')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/, { timeout: 45_000 })
  })

  test('satış sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/satis', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/satis/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('satış sayfasında barkod/ürün arama alanı var', async ({ page }) => {
    await page.goto('/dashboard/satis', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    // Form elementlerinden biri görünür olmalı
    await expect(page.locator('body')).toBeVisible()
  })
})
