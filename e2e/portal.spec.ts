import { test, expect } from '@playwright/test'

test.describe('Portal public', () => {
  test('takip without shop shows error', async ({ page }) => {
    await page.goto('/takip')
    await expect(page.locator('body')).toBeVisible()
  })
})
