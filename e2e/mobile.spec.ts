import { test, expect, devices } from '@playwright/test'

/**
 * Mobil PWA ve responsive E2E testleri — genişletilmiş.
 * Mevcut testlere ek yeni senaryolar.
 */

test.describe('Mobile Responsive — Dashboard', () => {
  test('dashboard login yönlendirmesi (mobil)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('kabul sayfası login yönlendirmesi (mobil)', async ({ page }) => {
    await page.goto('/dashboard/kabul', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('atolye sayfası login yönlendirmesi (mobil)', async ({ page }) => {
    await page.goto('/dashboard/atolye', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('fatura sayfası login yönlendirmesi (mobil)', async ({ page }) => {
    await page.goto('/dashboard/fatura', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('kasa sayfası login yönlendirmesi (mobil)', async ({ page }) => {
    await page.goto('/dashboard/kasa', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })
})

test.describe('Login sayfası mobile UX', () => {
  test('login dokunma hedefleri yeterli boyutta', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()

    const btn = page.locator('button[type="submit"]').first()
    await expect(btn).toBeVisible({ timeout: 30_000 })

    const box = await btn.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(120)
  })

  test('login viewport genişliği 500px veya daha dar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Bu test yalnızca mobil cihaz emülasyonunda geçerlidir')
    const viewport = page.viewportSize()
    expect(viewport?.width ?? 9999).toBeLessThanOrEqual(500)
  })

  test('login sayfasında email ve password alanları var', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({ timeout: 15_000 })
  })

  test('submit butonu görünür', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Landing sayfası mobile uyumu', () => {
  test('landing sayfası mobilde yükleniyor', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
    // Yatay scroll kontrolü
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    // Küçük margin toleransı ile
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20)
  })

  test('landing sayfasında CTA butonları touchable boyutta', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
    const ctaButtons = page.locator('a.btn, button, a[href*="login"], a[href*="basvuru"]')
    const count = await ctaButtons.count()
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const box = await ctaButtons.nth(i).boundingBox()
        if (box && box.height > 24) {
          expect(box.height).toBeGreaterThanOrEqual(36)
        }
      }
    }
  })
})

test.describe('Hukuki sayfalar mobile', () => {
  test('gizlilik politikası mobilde okunabilir', async ({ page }) => {
    const res = await page.goto('/gizlilik-politikasi', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })

  test('KVKK sayfası mobilde okunabilir', async ({ page }) => {
    const res = await page.goto('/kvkk', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('PWA manifest ve ikonlar', () => {
  test('manifest.json geçerli ve PNG ikonları içerir', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    const srcs = (json.icons as { src: string }[]).map(i => i.src)
    expect(srcs).toContain('/icon-192.png')
    expect(srcs).toContain('/icon-512.png')
  })

  test('PWA icon dosyaları erişilebilir', async ({ request }) => {
    for (const path of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(200)
      expect(res.headers()['content-type'] || '').toMatch(/image\/png/)
    }
  })

  test('favicon veya app icon erişilebilir', async ({ request }) => {
    const res = await request.get('/icon-192.png')
    expect(res.status()).toBe(200)
  })
})
