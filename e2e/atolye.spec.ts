import { test, expect } from '@playwright/test'

test.describe('Atolye', () => {
  test('atolye page requires auth', async ({ page }) => {
    await page.goto('/dashboard/atolye')
    await expect(page).toHaveURL(/login/)
  })
})
