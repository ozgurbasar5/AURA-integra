import { test, expect } from '@playwright/test'

test.describe('Satis', () => {
  test('satis page requires auth', async ({ page }) => {
    await page.goto('/dashboard/satis')
    await expect(page).toHaveURL(/login/)
  })
})
