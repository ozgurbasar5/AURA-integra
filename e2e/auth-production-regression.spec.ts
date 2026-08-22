import { test, expect } from '@playwright/test'

/**
 * Production Auth, Profile, Tenant & Role Resolution Regression Test Suite
 */

test.describe('Auth & Profile Production Regression', () => {
  test('1. Bilinmeyen veya tenantsız profil /login sayfasında kontrollü uyarı gösterir', async ({ page }) => {
    await page.goto('/login?error=no_tenant', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    const errorText = page.locator('text=Bayi hesabınız bulunamadı')
    await expect(errorText).toBeVisible()
  })

  test('2. Pasif tenant / hesap /login sayfasında hesap pasif uyarısı gösterir', async ({ page }) => {
    await page.goto('/login?error=profile_inactive', { waitUntil: 'domcontentloaded' })
    const errorText = page.locator('text=Kullanıcı hesabınız pasif')
    await expect(errorText).toBeVisible()
  })

  test('3. Yetkisiz admin paneli erişimi /login sayfasına admin_denied ile yönlenir', async ({ page }) => {
    await page.goto('/login?error=admin_denied', { waitUntil: 'domcontentloaded' })
    const errorText = page.locator('text=Bu hesap süper admin paneline erişemez')
    await expect(errorText).toBeVisible()
  })

  test('4. Oturum açılmamışken /dashboard rotası doğrudan /login sayfasına yönlendirir', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('5. Oturum açılmamışken /admin rotası doğrudan /login sayfasına yönlendirir', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('6. /api/diagnostics/env endpoint secret sızdırmadan boolean flag döner', async ({ request }) => {
    const res = await request.get('/api/diagnostics/env')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(typeof json.supabaseUrl).toBe('boolean')
    expect(typeof json.anonKey).toBe('boolean')
    expect(typeof json.serviceRoleKey).toBe('boolean')
    expect(json.service_role).toBeUndefined()
    expect(json.key).toBeUndefined()
  })

  test('7. /api/auth/session anonim istekte authenticated: false döner', async ({ request }) => {
    const res = await request.get('/api/auth/session')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.authenticated).toBe(false)
  })
})
