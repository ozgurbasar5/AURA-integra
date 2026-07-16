import { test, expect } from '@playwright/test'

/**
 * Kritik ERP zinciri — auth olmadan route koruması + public API yüzeyleri.
 * Tam authenticated akış için E2E_EMAIL / E2E_PASSWORD gerekir (opsiyonel).
 */
test.describe('ERP zinciri koruması', () => {
  for (const path of [
    '/dashboard/kabul',
    '/dashboard/atolye',
    '/dashboard/satis',
    '/dashboard/kasa',
    '/dashboard/stok/sayim',
    '/dashboard/alis',
    '/dashboard/fatura',
  ]) {
    test(`${path} requires auth`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/login/, { timeout: 30_000 })
    })
  }
})

test.describe('ERP API yüzeyleri', () => {
  test('service-orders API rejects anonymous', async ({ request }) => {
    const res = await request.get('/api/service-orders?limit=1')
    expect([401, 403]).toContain(res.status())
  })

  test('sales API rejects anonymous POST', async ({ request }) => {
    const res = await request.post('/api/tenant/sales', {
      data: { items: [], payment_method: 'nakit' },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('stock count API rejects anonymous', async ({ request }) => {
    const res = await request.post('/api/tenant/stock/count', {
      data: { items: [] },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('integrations health rejects anonymous', async ({ request }) => {
    const res = await request.get('/api/tenant/integrations/health')
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Authenticated ERP chain (optional)', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E_EMAIL/PASSWORD yok')

  test('login → kabul → atolye → satis → kasa reachable', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/, { timeout: 45_000 })

    for (const path of ['/dashboard/kabul', '/dashboard/atolye', '/dashboard/satis', '/dashboard/kasa']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')))
      await expect(page.locator('body')).toBeVisible()
    }

    await page.goto('/dashboard/fatura', { waitUntil: 'domcontentloaded' })
    const stub = page.locator('[data-tour="efatura-stub-uyari"]')
    // Stub ortamında uyarı beklenir; canlı NES/Logo'da olmayabilir
    if (await stub.count()) {
      await expect(stub).toContainText(/stub|Test/i)
    }
  })
})
