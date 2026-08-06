import { test, expect } from '@playwright/test'

/**
 * Admin panel E2E testleri — auth guard ve temel yüklemeler.
 * Authenticated akış için E2E_EMAIL / E2E_PASSWORD env değişkenleri gerekir.
 */

test.describe('Admin panel auth guard', () => {
  const adminRoutes = [
    '/admin',
    '/admin/basvurular',
    '/admin/bayiler',
    '/admin/odemeler',
    '/admin/operasyon',
    '/admin/yenilikler',
    '/admin/dokumantasyon',
    '/admin/ayarlar',
  ]

  for (const path of adminRoutes) {
    test(`${path} kimlik doğrulama gerektirir`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      // Auth olmadan login'e yönlendirilmeli
      await expect(page).toHaveURL(/login/, { timeout: 30_000 })
    })
  }
})

test.describe('Admin API guard', () => {
  test('admin platform-settings 401 döner (anon)', async ({ request }) => {
    const res = await request.get('/api/admin/platform-settings')
    expect([401, 403]).toContain(res.status())
  })

  test('admin stats API 401 döner (anon)', async ({ request }) => {
    const res = await request.get('/api/admin/stats')
    expect([401, 403, 404]).toContain(res.status())
  })
})

test.describe('Admin authenticated akış (opsiyonel)', () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD || !process.env.E2E_ADMIN_EMAIL,
    'E2E_ADMIN_EMAIL/PASSWORD yok',
  )

  test('admin giriş → panel yüklenir', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_ADMIN_EMAIL!)
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/admin|dashboard/, { timeout: 45_000 })
    await expect(page.locator('body')).toBeVisible()
  })
})
