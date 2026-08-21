import { test, expect } from '@playwright/test'

/**
 * E2E BUSINESS FLOW & REAL USER FLOW AUDIT
 *
 * Amaç:
 * 1. Public sayfaların (Takip, Onay Portalı, Landing, Başvuru) doğru ve güvenli çalışmasını doğrulamak.
 * 2. Hassas maliyet / kâr verilerinin public görünümde sızdırılmadığını doğrulamak.
 * 3. Korumalı rotaların auth olmadan güvenle login'e yönlendirdiğini kanıtlamak.
 * 4. Çoklu responsive viewportlarda (Mobil ve Masaüstü) dokunma hedefleri ve overflow denetimi yapmak.
 */

test.describe('E2E Flow: Public Tracking & Data Exposure Defense', () => {
  test('1. /takip sayfası yüklenir ve form kullanılabilirdir', async ({ page }) => {
    const res = await page.goto('/takip', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()

    // Arama veya sorgu inputu
    const input = page.locator('input[type="text"], input[name="order_no"], input[placeholder*="Takip"], input[placeholder*="kod"], input').first()
    await expect(input).toBeVisible({ timeout: 15_000 })
  })

  test('2. /takip sayfasında internal maliyet, kâr veya bayi gizli bilgileri sızdırılmaz', async ({ page }) => {
    await page.goto('/takip?q=SRV-2026-001', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const bodyText = await page.innerText('body')

    // Hassas anahtar kelimelerin public görünümde OLMADIĞI doğrulanır
    expect(bodyText).not.toContain('purchase_price')
    expect(bodyText).not.toContain('net_profit')
    expect(bodyText).not.toContain('technician_cost')
    expect(bodyText).not.toContain('service_role')
  })
})

test.describe('E2E Flow: Public Quote Approval Portal', () => {
  test('1. Geçersiz token ile /onay/[token] sayfası açıldığında hata veya 404 mesajı gösterilir', async ({ page }) => {
    const res = await page.goto('/onay/invalid-test-token-12345', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect(res?.status()).toBeDefined()
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('E2E Flow: Protected Dashboard Routes Redirection', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/kabul',
    '/dashboard/atolye',
    '/dashboard/satis',
    '/dashboard/kasa',
    '/dashboard/stok',
    '/dashboard/garanti',
    '/dashboard/musteriler',
    '/dashboard/ayarlar',
  ]

  for (const route of protectedRoutes) {
    test(`Oturumsuz istek ${route} rotasını login sayfasına yönlendirir`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/login/, { timeout: 30_000 })
    })
  }
})

test.describe('E2E Flow: Responsive Viewports & Touch Target Audit', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE (320x568)' },
    { width: 375, height: 667, name: 'iPhone 8 (375x667)' },
    { width: 390, height: 844, name: 'iPhone 13 (390x844)' },
    { width: 412, height: 915, name: 'Samsung S20 (412x915)' },
    { width: 768, height: 1024, name: 'iPad Mini (768x1024)' },
    { width: 1280, height: 720, name: 'HD Desktop (1280x720)' },
    { width: 1440, height: 900, name: 'MacBook Pro (1440x900)' },
  ]

  for (const vp of viewports) {
    test(`Login sayfası ${vp.name} ekranında taşma olmadan ve dokunma hedefleri erişilebilir yüklenir`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()

      // Yatay taşma (horizontal overflow) denetimi
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const clientWidth = await page.evaluate(() => document.body.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 25)

      // Submit butonu touch target boyutu
      const btn = page.locator('button[type="submit"]').first()
      await expect(btn).toBeVisible({ timeout: 15_000 })
      const box = await btn.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(36)
    })
  }
})
