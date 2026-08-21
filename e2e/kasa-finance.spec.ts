import { test, expect } from '@playwright/test'

/**
 * Kasa 2.0 Desktop Kasa & Finans Konsolu E2E Testleri
 */

test.describe('Kasa & Finans Konsolu Auth Guard', () => {
  test('/dashboard/kasa kimlik doğrulama gerektirir', async ({ page }) => {
    await page.goto('/dashboard/kasa', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })
})

test.describe('Kasa 2.0 Authenticated Desktop Akışı', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E_EMAIL/PASSWORD tanımlı değil')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/, { timeout: 45_000 })
  })

  test('kasa konsolu yüklenir ve ana bileşenler görüntülenir', async ({ page }) => {
    await page.goto('/dashboard/kasa', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/dashboard\/kasa/)

    // 1. Başlık kontrolü
    await expect(page.locator('h1, [data-tour="kasa-baslik"]')).toBeVisible()

    // 2. Hesap kartları alanı
    await expect(page.locator('[data-tour="kasa-hesap-kartlari"]')).toBeVisible()

    // 3. Hızlı aksiyonlar
    await expect(page.locator('[data-tour="kasa-quick-actions"]')).toBeVisible()

    // 4. Günlük finans özeti
    await expect(page.locator('[data-tour="kasa-gunluk-ozet"]')).toBeVisible()

    // 5. Canlı defter tablosu
    await expect(page.locator('[data-tour="kasa-canli-defter"]')).toBeVisible()
  })
})
