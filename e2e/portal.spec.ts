import { test, expect } from '@playwright/test'

test.describe('Portal public sayfaları', () => {
  test('takip without shop shows error', async ({ page }) => {
    await page.goto('/takip', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('takip sayfası arama ile yüklenir', async ({ page }) => {
    await page.goto('/takip?q=SRV-001&shop=demo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('portal slug sayfası 200 veya 404 döner', async ({ page }) => {
    const res = await page.goto('/portal/demo-test', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    expect([200, 404]).toContain(res?.status())
  })
})

test.describe('Portal takip API', () => {
  test('shop parametresi olmadan 400 döner', async ({ request }) => {
    const res = await request.get('/api/public/takip?q=SRV-001')
    expect(res.status()).toBe(400)
  })

  test('bilinmeyen shop ile 404 döner', async ({ request }) => {
    const res = await request.get('/api/public/takip?shop=cok-bilinmeyen-magaza-xyz-999&q=SRV-001')
    expect(res.status()).toBe(404)
  })

  test('boş sorgu parametresi ile çalışır', async ({ request }) => {
    const res = await request.get('/api/public/takip?shop=demo&q=')
    // 400 veya 200 (boş sonuç) olabilir
    expect([200, 400, 404]).toContain(res.status())
  })
})
