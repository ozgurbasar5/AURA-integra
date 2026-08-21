import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertBadRequest,
  assertUnauthorized,
  assertForbidden,
} from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

describe('API Test: /api/tenant/sales (Kasa 2.0 POS Finance)', () => {
  const validStockId = '11111111-1111-4111-8111-111111111111'
  const validAccountId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Oturum yoksa 401 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { POST } = await import('@/app/api/tenant/sales/route')
    const req = createMockNextRequest('http://localhost/api/tenant/sales', {
      method: 'POST',
      body: {
        items: [{ stock_id: validStockId, name: 'Ekran', qty: 1, unit_price: 1000 }],
        payment_method: 'nakit',
      },
    })
    const res = await POST(req)
    await assertUnauthorized(res)
  })

  it('2. Finans yetkisi olmayan teknisyen rolü için 403 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-tech',
      tenantId: 'tenant-1',
      role: 'teknisyen',
    })

    const { POST } = await import('@/app/api/tenant/sales/route')
    const req = createMockNextRequest('http://localhost/api/tenant/sales', {
      method: 'POST',
      body: {
        items: [{ stock_id: validStockId, name: 'Ekran', qty: 1, unit_price: 1000 }],
        payment_method: 'nakit',
      },
    })
    const res = await POST(req)
    await assertForbidden(res, 'Satış yetkisi yok')
  })

  it('3. Sepet boşsa 400 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-pos',
      tenantId: 'tenant-1',
      role: 'kasiyer',
    })

    const { POST } = await import('@/app/api/tenant/sales/route')
    const req = createMockNextRequest('http://localhost/api/tenant/sales', {
      method: 'POST',
      body: { items: [], payment_method: 'nakit' },
    })
    const res = await POST(req)
    await assertBadRequest(res, 'Sepet boş')
  })

  it('4. Açık vardiya (cash_shift) olmadan da POS satışı 200 döner ve hesaba işler', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-pos',
      tenantId: 'tenant-1',
      role: 'kasiyer',
    })

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validStockId, name: 'iPhone Ekran', stock_qty: 10, purchase_price: 500 },
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async () => ({
        data: {
          ok: true,
          sale_id: 'sale-pos-123',
          transaction_id: 'tx-pos-123',
          account_id: validAccountId,
          account_balance: 5500,
          total_with_vat: 1200,
          subtotal: 1000,
          vat_amount: 200,
          cash_shift_id: null, // Vardiya yok!
        },
        error: null,
      }),
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/tenant/sales/route')
    const req = createMockNextRequest('http://localhost/api/tenant/sales', {
      method: 'POST',
      body: {
        items: [{ stock_id: validStockId, name: 'iPhone Ekran', qty: 1, unit_price: 1000 }],
        payment_method: 'nakit',
        customer_name: 'Ahmet Bey',
      },
    })
    const res = await POST(req)
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.sale_id).toBe('sale-pos-123')
    expect(body.transaction_id).toBe('tx-pos-123')
    expect(body.account_id).toBe(validAccountId)
    expect(body.cash_shift_id).toBeNull() // Vardiya olmasa da başarıyla tamamlandı
    expect(body.total_with_vat).toBe(1200)
  })

  it('5. İstemci account_id override ile POS satışı yaparsa o hesaba işlenir', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-pos',
      tenantId: 'tenant-1',
      role: 'kasiyer',
    })

    const customAccountId = '44444444-4444-4444-8444-444444444444'

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validStockId, name: 'Samsung Kılıf', stock_qty: 20, purchase_price: 50 },
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async () => ({
        data: {
          ok: true,
          sale_id: 'sale-pos-custom',
          transaction_id: 'tx-pos-custom',
          account_id: customAccountId,
          account_balance: 15000,
          total_with_vat: 360,
          subtotal: 300,
          vat_amount: 60,
          cash_shift_id: null,
        },
        error: null,
      }),
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/tenant/sales/route')
    const req = createMockNextRequest('http://localhost/api/tenant/sales', {
      method: 'POST',
      body: {
        items: [{ stock_id: validStockId, name: 'Samsung Kılıf', qty: 2, unit_price: 150 }],
        payment_method: 'kredi_karti',
        account_id: customAccountId,
      },
    })
    const res = await POST(req)
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.account_id).toBe(customAccountId)
    expect(body.account_balance).toBe(15000)
  })
})
