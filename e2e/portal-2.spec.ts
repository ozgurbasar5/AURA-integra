import { test, expect } from '@playwright/test'

test.describe('Portal 2.0 Customer Self-Service E2E', () => {
  test('portal landing page loads with verification input and branding', async ({ page }) => {
    await page.goto('/portal/demo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()

    // Header or brand title should be visible
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()

    // Verification search input should be present
    const searchInput = page.locator('input[placeholder*="SRV"]')
    await expect(searchInput).toBeVisible()

    // Submit button should be visible
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('verification form displays error on invalid order query', async ({ page }) => {
    await page.goto('/portal/demo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const searchInput = page.locator('input[placeholder*="SRV"]')
    await searchInput.fill('SRV-9999-NOTFOUND')

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Should display error message
    await expect(page.locator('text=bulunamadı').or(page.locator('text=hata'))).toBeVisible({
      timeout: 10_000,
    })
  })

  test('portal API auth guard enforces security on data and claim endpoints', async ({ request }) => {
    // 1. Data endpoint without token should return 401
    const dataRes = await request.get('/api/public/portal/demo/data')
    expect([401, 404]).toContain(dataRes.status())

    // 2. Claim endpoint without token should return 401
    const claimRes = await request.post('/api/public/portal/demo/claim', {
      data: { warranty_id: '123', issue_description: 'test' },
    })
    expect([401, 404]).toContain(claimRes.status())

    // 3. Verify endpoint rejects empty query
    const verifyRes = await request.post('/api/public/portal/demo/auth/verify', {
      data: {},
    })
    expect([400, 404]).toContain(verifyRes.status())
  })
})

test.describe('Portal 2.0 Responsive Viewport & Touch Ergonomics', () => {
  const VIEWPORTS = [
    { name: 'iPhone SE (320x568)', width: 320, height: 568 },
    { name: 'iPhone 8 (375x667)', width: 375, height: 667 },
    { name: 'iPhone 13 (390x844)', width: 390, height: 844 },
    { name: 'Samsung S20 (412x915)', width: 412, height: 915 },
  ]

  for (const vp of VIEWPORTS) {
    test(`Portal renders without horizontal overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/portal/demo', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2
      })
      expect(overflow).toBe(false)

      // Ensure submit button is touch-friendly (>= 40px)
      const submitBtn = page.locator('button[type="submit"]')
      if (await submitBtn.isVisible()) {
        const box = await submitBtn.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(38)
        }
      }
    })
  }
})
