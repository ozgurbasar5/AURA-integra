import { test, expect } from '@playwright/test'

test.describe('Public pages smoke', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('legal pages return 200', async ({ page }) => {
    for (const path of ['/gizlilik-politikasi', '/kullanim-sartlari', '/kvkk']) {
      const res = await page.goto(path)
      expect(res?.status()).toBeLessThan(400)
    }
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /giriş/i })).toBeVisible()
  })

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health/supabase')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('ok')
  })
})
