import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /giriş/i })).toBeVisible()
  })
})

test.describe('Portal', () => {
  test('portal demo page loads', async ({ page }) => {
    await page.goto('/portal/aura-demo')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Basvuru', () => {
  test('basvuru form loads', async ({ page }) => {
    await page.goto('/basvuru')
    await expect(page.locator('body')).toBeVisible()
  })
})
