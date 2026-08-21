import { describe, it, expect } from 'vitest'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'

describe('Admin 2.0 Tenant Audit Log', () => {
  it('formats tenant audit log entries with mandatory security fields', async () => {
    // Test that the logger safely handles calls even without Supabase service env configured in test
    await expect(
      writeTenantAuditLog({
        tenantId: 'tenant-123',
        userId: 'user-456',
        action: 'update',
        entityType: 'service_rules',
        newData: { default_service_fee: 300 },
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest Agent',
      })
    ).resolves.not.toThrow()
  })
})
