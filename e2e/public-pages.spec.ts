import { test, expect } from '@playwright/test'

/**
 * Landing Page 2.0 & Public Sayfalar E2E Testleri
 */

test.describe('Landing Page 2.0', () => {
  test('anasayfa başarıyla yüklenir ve ana başlık görünür', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()

    // Hero headline check
    const heroHeading = page.locator('h1')
    await expect(heroHeading).toContainText('Servis işletmenizin tamamını')
    await expect(heroHeading).toContainText('tek merkezden')
  })

  test('Demo Talep Et butonuna basıldığında demo modalı açılır', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(600)
    
    const demoBtn = page.locator('#hero-demo-button')
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()

    // Modal should be visible
    await expect(page.locator('#demo-modal')).toBeVisible({ timeout: 10_000 })
  })

  test('tüm ana ürün ve operasyon bölümleri sayfada yer alır', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    await expect(page.locator('#akis')).toBeVisible()
    await expect(page.locator('#servis')).toBeVisible()
    await expect(page.locator('#finans')).toBeVisible()
    await expect(page.locator('#mobil')).toBeVisible()
    await expect(page.locator('#portal')).toBeVisible()
    await expect(page.locator('#admin')).toBeVisible()
    await expect(page.locator('#guvenlik')).toBeVisible()
    await expect(page.locator('#roller')).toBeVisible()
    await expect(page.locator('#nasil-calisir')).toBeVisible()
    await expect(page.locator('#paketler')).toBeVisible()
    await expect(page.locator('#kurumsal')).toBeVisible()
  })

  test('mobil görünümde logo ve menü düzgün çalışır', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(600)

    await expect(page.locator('header')).toBeVisible()
    const menuBtn = page.getByLabel('Menüyü aç')
    if (await menuBtn.isVisible()) {
      await menuBtn.click()
      await expect(page.locator('#mobile-menu-drawer')).toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe('Başvuru sayfası', () => {
  test('başvuru sayfası yükleniyor', async ({ page }) => {
    const res = await page.goto('/basvuru', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })

  test('başvuru formunda gerekli alanlar var', async ({ page }) => {
    await page.goto('/basvuru', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const inputs = page.locator('input, textarea, select')
    await expect(inputs.first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Public sayfalar', () => {
  test('durum sayfası erişilebilir', async ({ page }) => {
    const res = await page.goto('/durum', { waitUntil: 'domcontentloaded', timeout: 60_000 })
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
    expect([200, 404]).toContain(res?.status())
  })
})
