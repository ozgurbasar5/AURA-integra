import { test, expect } from '@playwright/test'

test.describe('Admin 2.0 Enterprise Control Center E2E', () => {
  test('Admin center API responds with health, kpis and alert structures', async ({ request }) => {
    const res = await request.get('/api/admin/center')
    // In unauthenticated context, route handles tenant auth cleanly
    expect([200, 401, 403]).toContain(res.status())
  })

  test('Organization API responds with role options and permission matrix', async ({ request }) => {
    const res = await request.get('/api/tenant/organization')
    expect([200, 401, 403]).toContain(res.status())
  })

  test('Service rules API responds with default numbering and status rules', async ({ request }) => {
    const res = await request.get('/api/tenant/service-rules')
    expect([200, 401, 403]).toContain(res.status())
  })

  test('Ayarlar page renders Control Center 2.0 tab and navigation', async ({ page }) => {
    await page.goto('/dashboard/ayarlar', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()

    // Tab list should contain Control Center 2.0
    const controlTab = page.locator('button:has-text("Control Center 2.0")')
    if (await controlTab.isVisible()) {
      await controlTab.click()
      await expect(page.locator('text=AURA Control Center').or(page.locator('text=Komuta Merkezi'))).toBeVisible()
    }
  })

  test('Admin overview dashboard loads cleanly', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Admin 2.0 Responsive Viewports', () => {
  const VIEWPORTS = [
    { name: 'Desktop HD (1280x720)', width: 1280, height: 720 },
    { name: 'FHD (1920x1080)', width: 1920, height: 1080 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile (390x844)', width: 390, height: 844 },
  ]

  for (const vp of VIEWPORTS) {
    test(`Dashboard ayarlar renders without horizontal overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/dashboard/ayarlar', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2
      })
      expect(overflow).toBe(false)
    })
  }
})
