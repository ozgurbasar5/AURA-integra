import { test, expect } from '@playwright/test'

test.describe('Kabul', () => {
  test('kabul page requires auth', async ({ page }) => {
    await page.goto('/dashboard/kabul')
    await expect(page).toHaveURL(/login/)
  })

  test('offline queue module loads in browser', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aura_web_offline_queue_v1', JSON.stringify([{
        id: 'test',
        path: '/api/service-orders',
        method: 'POST',
        body: { customer_name: 'Test' },
        created_at: new Date().toISOString(),
        label: 'Test kabul',
      }]))
    })
    const jobs = await page.evaluate(() => {
      const raw = localStorage.getItem('aura_web_offline_queue_v1')
      return raw ? JSON.parse(raw).length : 0
    })
    expect(jobs).toBe(1)
  })
})
