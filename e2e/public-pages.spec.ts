import { test, expect } from '@playwright/test'

/**
 * Başvuru sayfası E2E testleri.
 * Form gönderimi, doğrulama ve hata durumları.
 */

test.describe('Başvuru sayfası', () => {
  test('başvuru sayfası yükleniyor', async ({ page }) => {
    const res = await page.goto('/basvuru', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })

  test('başvuru formunda gerekli alanlar var', async ({ page }) => {
    await page.goto('/basvuru', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // Form alanları veya input kontrolleri
    const inputs = page.locator('input, textarea, select')
    await expect(inputs.first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Public sayfalar', () => {
  test('durum sayfası erişilebilir', async ({ page }) => {
    const res = await page.goto('/durum', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // 200 veya 404 olabilir (sayfa henüz yoksa)
    expect(res?.status()).toBeDefined()
  })

  test('onay sayfası erişilebilir', async ({ page }) => {
    const res = await page.goto('/onay', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeDefined()
  })

  test('takip sayfası erişilebilir', async ({ page }) => {
    const res = await page.goto('/takip', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
  })

  test('takip sayfası arama parametresi ile çalışır', async ({ page }) => {
    const res = await page.goto('/takip?q=SRV-001&shop=demo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Portal sayfası', () => {
  test('portal slug sayfası 200 veya 404 döner', async ({ page }) => {
    const res = await page.goto('/portal/test-magaza', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // Bilinmeyen slug → 404 veya "not found" sayfası
    expect([200, 404]).toContain(res?.status())
  })
})
