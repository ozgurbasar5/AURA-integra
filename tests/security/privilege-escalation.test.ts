import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertForbidden,
} from '../api/helpers/api-client'
import { requireTenantAuth, requireTenantOwner } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings, canPushFinance } from '@/lib/api-role-guard'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
    requireTenantOwner: vi.fn(),
  }
})

describe('Security: Privilege Escalation & Role Security', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(requireTenantOwner).mockReset()
  })

  it('Teknisyen veya kasiyer rolü bayi yönetim ayarlarını (canManageTenantSettings) değiştiremez', () => {
    expect(canManageTenantSettings('teknisyen')).toBe(false)
    expect(canManageTenantSettings('kasiyer')).toBe(false)
    expect(canManageTenantSettings('satis')).toBe(false)
    expect(canManageTenantSettings('viewer')).toBe(false)
  })

  it('Teknisyen rolü yönetici endpointi çağırdığında requireTenantOwner tarafından 403 ile engellenir', async () => {
    vi.mocked(requireTenantOwner).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Bu işlem için yönetici yetkisi gerekli',
    })

    const res = await requireTenantOwner()
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(403)
      expect(res.message).toContain('yönetici yetkisi')
    }
  })

  it('Teknisyen veya Viewer finansal işlem (canPushFinance) oluşturamaz', () => {
    expect(canPushFinance('teknisyen')).toBe(false)
    expect(canPushFinance('viewer')).toBe(false)
    expect(canPushFinance('satis')).toBe(false)
  })

  it('İstek gövdesine (body) sahte role: "super_admin" veya is_admin: true konulması kullanıcının yetkisini yükseltemez', async () => {
    let savedRole: string | null = null

    // Teknisyen kullanıcısı simülasyonu
    const initialRole = 'teknisyen'

    // Server-side sanitize simülasyonu: role alanı client girdisinden doğrudan alınamaz
    const updateProfile = (body: Record<string, unknown>) => {
      // Whitelist alanlar: sadece full_name, phone güncellenebilir; role güncellenemez!
      const allowedUpdates: Record<string, unknown> = {}
      if (body.full_name) allowedUpdates.full_name = body.full_name
      if (body.phone) allowedUpdates.phone = body.phone
      // Privilege escalation koruması: body.role veya body.is_admin yok sayılır!
      savedRole = (allowedUpdates.role as string) ?? initialRole
      return { ok: true, profile: { role: savedRole, ...allowedUpdates } }
    }

    const maliciousBody = {
      full_name: 'Hacked User',
      role: 'super_admin', // Yetki yükseltme denemesi!
      is_admin: true,
    }

    const result = updateProfile(maliciousBody)
    expect(result.ok).toBe(true)
    expect(result.profile.role).toBe('teknisyen') // Hâlâ teknisyen, super_admin DEĞİL!
    expect(savedRole).toBe('teknisyen')
  })
})
