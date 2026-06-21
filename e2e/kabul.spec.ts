import { test, expect } from '@playwright/test'

test.describe('Kabul', () => {
  test('kabul page requires auth', async ({ page }) => {
    await page.goto('/dashboard/kabul')
    await expect(page).toHaveURL(/login/)
  })
})
