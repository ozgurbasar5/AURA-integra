import { test, expect } from '@playwright/test'

test.describe('User Customization 2.0 API & Security E2E', () => {
  test('User Preferences API responds correctly', async ({ request }) => {
    const res = await request.get('/api/tenant/me/preferences')
    expect([200, 401, 403]).toContain(res.status())
  })
})

test.describe('User Customization 2.0 Responsive Viewport & Ergonomics', () => {
  const VIEWPORTS = [
    { name: 'iPhone SE (320x568)', width: 320, height: 568 },
    { name: 'iPhone 8 (375x667)', width: 375, height: 667 },
    { name: 'iPhone 13 (390x844)', width: 390, height: 844 },
    { name: 'Samsung S20 (412x915)', width: 412, height: 915 },
  ]

  for (const vp of VIEWPORTS) {
    test(`Workspace Settings renders without horizontal overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/dashboard/ayarlar', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2
      })
      expect(overflow).toBe(false)
    })
  }
})
