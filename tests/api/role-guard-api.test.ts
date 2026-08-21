import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  canWriteTenantData,
  canPushFinance,
  canManageTenantSettings,
} from '@/lib/api-role-guard'
import { createMockNextRequest, assertForbidden } from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('API Test: Role Authorization Matrix & Route Guards', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  describe('1. canWriteTenantData Yetki Matrisi', () => {
    const allowedRoles = ['tenant_admin', 'mudur', 'teknisyen', 'muhasebe', 'satis', 'kasiyer']
    const deniedRoles = ['viewer']

    it.each(allowedRoles)('yazma işlemlerine izin verir: role=%s', (role) => {
      expect(canWriteTenantData(role)).toBe(true)
    })

    it.each(deniedRoles)('sadece okuma yapan rolleri reddeder: role=%s', (role) => {
      expect(canWriteTenantData(role)).toBe(false)
    })
  })

  describe('2. canPushFinance Finans Yazma Yetki Matrisi', () => {
    const allowedFinanceRoles = ['tenant_admin', 'mudur', 'muhasebe', 'kasiyer']
    const deniedFinanceRoles = ['teknisyen', 'satis', 'viewer']

    it.each(allowedFinanceRoles)('finansal tahsilat ve kasaya izin verir: role=%s', (role) => {
      expect(canPushFinance(role)).toBe(true)
    })

    it.each(deniedFinanceRoles)('yetkisiz rollerin finans girmesini engeller: role=%s', (role) => {
      expect(canPushFinance(role)).toBe(false)
    })
  })

  describe('3. canManageTenantSettings Bayi Yönetim Matrisi', () => {
    const ownerRoles = ['tenant_admin', 'mudur']
    const nonOwnerRoles = ['teknisyen', 'muhasebe', 'satis', 'kasiyer', 'viewer']

    it.each(ownerRoles)('yönetici ayarlarına izin verir: role=%s', (role) => {
      expect(canManageTenantSettings(role)).toBe(true)
    })

    it.each(nonOwnerRoles)('yönetici olmayan rolleri engeller: role=%s', (role) => {
      expect(canManageTenantSettings(role)).toBe(false)
    })
  })

  describe('4. Endpoint Üzerinde Role Guard Denetimi', () => {
    it('Viewer rolü ile POST /api/service-orders çağrıldığında 403 Forbidden döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-viewer-1',
        tenantId: 'tenant-1',
        role: 'viewer',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: { device_brand: 'Apple', device_model: 'iPhone 13' },
      })
      const res = await POST(req)
      await assertForbidden(res, 'Viewer POST Service Order')
    })

    it('Teknisyen rolü ile POST /api/tenant/transactions (Finans) çağrıldığında 403 Forbidden döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech-1',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/tenant/transactions/route')
      const req = createMockNextRequest('http://localhost/api/tenant/transactions', {
        method: 'POST',
        body: {
          transaction: {
            type: 'gelir',
            amount: 1000,
            description: 'Kasa girişi',
          },
        },
      })
      const res = await POST(req)
      await assertForbidden(res, 'Technician POST Finance')
    })
  })
})
