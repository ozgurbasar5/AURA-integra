import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

vi.mock('@/lib/portal-tenant', () => ({
  resolveTenantByPortalSlug: vi.fn(),
}))

vi.mock('@/lib/public-tracking', () => ({
  searchTenantOrders: vi.fn(),
  fetchOrderStatusHistory: vi.fn(),
  toPublicOrderHits: vi.fn(),
}))

import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { searchTenantOrders, toPublicOrderHits } from '@/lib/public-tracking'
import { GET } from '@/app/api/public/takip/route'

describe('public takip route', () => {
  beforeEach(() => {
    vi.mocked(getServiceClient).mockReset()
    vi.mocked(resolveTenantByPortalSlug).mockReset()
    vi.mocked(searchTenantOrders).mockReset()
    vi.mocked(toPublicOrderHits).mockReset()
  })

  it('returns 400 without shop slug', async () => {
    vi.mocked(getServiceClient).mockReturnValue({} as never)
    const req = new NextRequest('http://localhost/api/public/takip?q=SRV-001')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown shop', async () => {
    vi.mocked(getServiceClient).mockReturnValue({} as never)
    vi.mocked(resolveTenantByPortalSlug).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/public/takip?shop=unknown&q=SRV-001')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('scopes search to resolved tenant', async () => {
    const admin = {} as never
    vi.mocked(getServiceClient).mockReturnValue(admin)
    vi.mocked(resolveTenantByPortalSlug).mockResolvedValue({
      id: 'tenant-1',
      company_name: 'Demo',
      phone: '0500',
      portal_slug: 'demo',
      feature_flags: { portal: true },
    })
    vi.mocked(searchTenantOrders).mockResolvedValue([{ id: 'order-1' }])
    vi.mocked(toPublicOrderHits).mockReturnValue([
      {
        id: 'order-1',
        order_no: 'SRV-001',
        status: 'alindi',
        public_status: 'alindi',
        status_label: 'Alındı',
        device_brand: 'Samsung',
        device_model: 'S23',
        imei: '',
        customer_name: 'Ali',
        customer_phone: '532***4567',
        estimated_cost: 0,
        created_at: '2026-01-01',
        eta: null,
        description: '',
      },
    ])

    const req = new NextRequest('http://localhost/api/public/takip?shop=demo&q=SRV-001')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(searchTenantOrders).toHaveBeenCalledWith(admin, 'tenant-1', 'SRV-001', 5)
  })
})
