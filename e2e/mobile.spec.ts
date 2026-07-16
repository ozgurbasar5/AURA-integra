import { test, expect } from '@playwright/test'

test.describe('Mobile PWA assets', () => {
  test('manifest lists PNG icons', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    const srcs = (json.icons as { src: string }[]).map(i => i.src)
    expect(srcs).toContain('/icon-192.png')
    expect(srcs).toContain('/icon-512.png')
  })

  test('PWA icon files exist', async ({ request }) => {
    for (const path of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(200)
      expect(res.headers()['content-type'] || '').toMatch(/image\/png/)
    }
  })
})

/** Run with: npx playwright test e2e/mobile.spec.ts --project="Mobile Chrome" */
test.describe('Mobile Chrome UX', () => {
  test('login is usable on phone viewport', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
    const btn = page.locator('button[type="submit"]').first()
    await expect(btn).toBeVisible({ timeout: 30_000 })
    const box = await btn.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)
    const viewport = page.viewportSize()
    expect(viewport?.width ?? 9999).toBeLessThanOrEqual(500)
  })

  test('dashboard redirects to login on mobile', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('sayim requires auth', async ({ page }) => {
    await page.goto('/dashboard/stok/sayim', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })

  test('satis requires auth', async ({ page }) => {
    await page.goto('/dashboard/satis', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/login/, { timeout: 30_000 })
  })
})
