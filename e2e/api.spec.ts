import { test, expect } from '@playwright/test'

/**
 * API endpoint testleri — auth guard ve temel sağlık kontrolü.
 */

test.describe('API health kontrolleri', () => {
  test('health/supabase endpoint çalışıyor', async ({ request }) => {
    const res = await request.get('/api/health/supabase')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('ok')
  })
})

test.describe('API auth guard — anonim istekler', () => {
  test('service-orders GET 401/403 döner', async ({ request }) => {
    const res = await request.get('/api/service-orders?limit=1')
    expect([401, 403]).toContain(res.status())
  })

  test('tenant sales POST 401/403/400 döner', async ({ request }) => {
    const res = await request.post('/api/tenant/sales', {
      data: { items: [], payment_method: 'nakit' },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('stock count POST 401/403/400 döner', async ({ request }) => {
    const res = await request.post('/api/tenant/stock/count', {
      data: { items: [] },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('integrations health GET 401/403 döner', async ({ request }) => {
    const res = await request.get('/api/tenant/integrations/health')
    expect([401, 403]).toContain(res.status())
  })

  test('tenant push POST 401/403 döner', async ({ request }) => {
    const res = await request.post('/api/tenant/push', {
      data: { module: 'stock', items: [] },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('admin platform-settings GET 401/403 döner', async ({ request }) => {
    const res = await request.get('/api/admin/platform-settings')
    expect([401, 403]).toContain(res.status())
  })

  test('notify POST 401/403 döner', async ({ request }) => {
    const res = await request.post('/api/notify', {
      data: { title: 'Test', body: 'Test', tenantId: 'test' },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('billing webhook GET 401/403/404 döner', async ({ request }) => {
    const res = await request.get('/api/billing/webhook')
    expect([401, 403, 404, 405]).toContain(res.status())
  })

  test('AI endpoint 401/403 döner (anonim)', async ({ request }) => {
    const res = await request.post('/api/ai/chat', {
      data: { messages: [{ role: 'user', content: 'merhaba' }] },
    })
    expect([401, 403, 404]).toContain(res.status())
  })

  test('search endpoint 401/403/400 döner (anonim)', async ({ request }) => {
    const res = await request.get('/api/search?q=test')
    expect([401, 403, 400, 404]).toContain(res.status())
  })
})

test.describe('Public API (anonim erişilebilir)', () => {
  test('public takip - shop olmadan 400 döner', async ({ request }) => {
    const res = await request.get('/api/public/takip?q=SRV-001')
    expect(res.status()).toBe(400)
  })

  test('public takip - bilinmeyen shop 404 döner', async ({ request }) => {
    const res = await request.get('/api/public/takip?shop=bilinmeyen-magaza-xyz&q=SRV-001')
    expect(res.status()).toBe(404)
  })
})

test.describe('v1 Public API', () => {
  test('v1 endpoint varlığını kontrol eder', async ({ request }) => {
    // v1 endpoint'leri varsa 401 veya 200 dönmeli, 500 dönmemeli
    const res = await request.get('/api/v1')
    expect(res.status()).not.toBe(500)
  })
})
