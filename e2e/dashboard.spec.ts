import { test, expect } from '@playwright/test'

/**
 * Dashboard modül erişim E2E testleri.
 * Authenticated akış için E2E_EMAIL / E2E_PASSWORD gerekir.
 */

test.describe('Dashboard modül auth guard — genişletilmiş', () => {
  const additionalRoutes = [
    '/dashboard/musteriler',
    '/dashboard/cari',
    '/dashboard/randevu',
    '/dashboard/garanti',
    '/dashboard/raporlar',
    '/dashboard/tedarik',
    '/dashboard/siparisler',
    '/dashboard/personel',
    '/dashboard/bildirimler',
    '/dashboard/kampanyalar',
    '/dashboard/ikinci-el',
    '/dashboard/calinti-kontrol',
    '/dashboard/firsatlar',
    '/dashboard/vitrin',
    '/dashboard/magaza',
    '/dashboard/komisyon',
    '/dashboard/yapilacaklar',
    '/dashboard/destek',
    '/dashboard/subeler',
    '/dashboard/ayarlar',
    '/dashboard/plan-yukselt',
    '/dashboard/musteri-portali',
    '/dashboard/finans',
    '/dashboard/varliklar',
    '/dashboard/yenilikler',
    '/dashboard/dokumantasyon',
    '/dashboard/nasil-calisir',
  ]

  for (const path of additionalRoutes) {
    test(`${path} kimlik doğrulama gerektirir`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/login/, { timeout: 30_000 })
    })
  }
})

test.describe('Dashboard authenticated akış (opsiyonel)', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E_EMAIL/PASSWORD yok')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/, { timeout: 45_000 })
  })

  test('dashboard ana sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('musteriler sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/musteriler', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/musteriler/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('stok sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/stok', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/stok/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('bildirimler sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/bildirimler', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/bildirimler/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('ayarlar sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/ayarlar', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/ayarlar/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('yenilikler sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/yenilikler', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/yenilikler/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('randevu sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/randevu', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/randevu/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('garanti sayfası yüklenir', async ({ page }) => {
    await page.goto('/dashboard/garanti', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/garanti/)
    await expect(page.locator('body')).toBeVisible()
  })
})
