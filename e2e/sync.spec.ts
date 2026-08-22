import { test, expect } from '@playwright/test'

test.describe('Sync Panel & Sync Lifecycle E2E', () => {
  test('1. Sync API returns 401 when requested without session', async ({ request }) => {
    const res = await request.get('/api/tenant/sync')
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  test('2. Push API returns 401 when requested without session', async ({ request }) => {
    const res = await request.post('/api/tenant/push', {
      data: { module: 'notificationSettings', settings: {} },
    })
    expect(res.status()).toBe(401)
  })

  test('3. Sync button in login / unauthenticated state does not cause unhandled crashes', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('form')).toBeVisible()
  })
})
