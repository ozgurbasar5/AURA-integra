import { describe, it, expect } from 'vitest'
import {
  checkRolePermission,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MODULES,
} from '@/lib/admin-permissions'
import { TENANT_ROLE_VALUES } from '@/lib/tenant-roles'

describe('Admin 2.0 Role & Permission Matrix', () => {
  it('covers all 7 tenant roles and all permission modules', () => {
    for (const role of TENANT_ROLE_VALUES) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toBeDefined()
      for (const mod of PERMISSION_MODULES) {
        expect(DEFAULT_ROLE_PERMISSIONS[role][mod.id]).toBeDefined()
      }
    }
  })

  it('guarantees tenant_admin has full administrative permissions', () => {
    expect(checkRolePermission('tenant_admin', 'services', 'create')).toBe(true)
    expect(checkRolePermission('tenant_admin', 'services', 'delete')).toBe(true)
    expect(checkRolePermission('tenant_admin', 'settings', 'settings')).toBe(true)
    expect(checkRolePermission('tenant_admin', 'personnel', 'delete')).toBe(true)
  })

  it('restricts technician from unauthorized destructive and financial actions', () => {
    expect(checkRolePermission('teknisyen', 'services', 'view')).toBe(true)
    expect(checkRolePermission('teknisyen', 'services', 'update')).toBe(true)
    expect(checkRolePermission('teknisyen', 'services', 'delete')).toBe(false)
    expect(checkRolePermission('teknisyen', 'finance', 'finance')).toBe(false)
    expect(checkRolePermission('teknisyen', 'settings', 'settings')).toBe(false)
  })

  it('restricts viewer to read-only access across all modules', () => {
    expect(checkRolePermission('viewer', 'services', 'view')).toBe(true)
    expect(checkRolePermission('viewer', 'services', 'create')).toBe(false)
    expect(checkRolePermission('viewer', 'services', 'update')).toBe(false)
    expect(checkRolePermission('viewer', 'finance', 'create')).toBe(false)
    expect(checkRolePermission('viewer', 'settings', 'update')).toBe(false)
  })
})
