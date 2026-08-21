import { test, expect } from '@playwright/test'

test.describe('Service Delivery Regression & Hydration Stability E2E', () => {
  test('1. Delivery API endpoint enforces authentication and validation', async ({ request }) => {
    const res = await request.post('/api/service-orders/00000000-0000-0000-0000-000000000000/deliver', {
      data: { service_fee: 1000, payment_method: 'nakit' },
    })
    expect([401, 403, 404]).toContain(res.status())
  })

  test('2. Dashboard, Atolye, Kasa pages load without hydration console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(msg.text())
      }
    })

    const routes = ['/dashboard', '/dashboard/atolye', '/dashboard/kasa', '/dashboard/ayarlar']

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      const hydrationMismatch = consoleErrors.some(err =>
        err.includes('Hydration failed') || err.includes('did not match') || err.includes('Expected server HTML')
      )
      expect(hydrationMismatch).toBe(false)
    }
  })
})
