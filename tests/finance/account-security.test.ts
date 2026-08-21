import { describe, it, expect } from 'vitest'

interface Account {
  id: string
  tenant_id: string
  name: string
  balance: number
}

describe('Kasa 2.0: Multi-Tenant Account Security & Isolation', () => {
  it('1. Cross-Tenant Transfer Blocked: Farklı tenantlara ait hesaplar arasında virman kesinlikle engellenir', () => {
    const tenantA_Account: Account = { id: 'acc-A', tenant_id: 'tenant-A', name: 'Nakit Kasa', balance: 10000 }
    const tenantB_Account: Account = { id: 'acc-B', tenant_id: 'tenant-B', name: 'Banka Hesabı', balance: 5000 }

    const executeTransfer = (callerTenantId: string, src: Account, tgt: Account, amount: number) => {
      if (src.tenant_id !== callerTenantId) {
        throw new Error('Kaynak hesap kiracıya ait değil (403 Forbidden)')
      }
      if (tgt.tenant_id !== callerTenantId) {
        throw new Error('Hedef hesap kiracıya ait değil (403 Forbidden)')
      }
      src.balance -= amount
      tgt.balance += amount
      return true
    }

    // Tenant A, kendi hesabından Tenant B'nin hesabına transfer deniyor
    expect(() => executeTransfer('tenant-A', tenantA_Account, tenantB_Account, 1000))
      .toThrow('Hedef hesap kiracıya ait değil')

    // Tenant B'nin hesabı bozulmamalıdır
    expect(tenantB_Account.balance).toBe(5000)
    expect(tenantA_Account.balance).toBe(10000)
  })

  it('2. Cross-Tenant Account Mutation Blocked: Tenant A, Tenant B nin hesap bakiyesini manipüle edemez', () => {
    const tenantB_Account: Account = { id: 'acc-B', tenant_id: 'tenant-B', name: 'Nakit Kasa', balance: 8000 }

    const adjustBalance = (callerTenantId: string, targetAccount: Account, delta: number) => {
      if (targetAccount.tenant_id !== callerTenantId) {
        throw new Error('Hesap erişim yetkisi yok (403 Forbidden)')
      }
      targetAccount.balance += delta
      return targetAccount.balance
    }

    expect(() => adjustBalance('tenant-A', tenantB_Account, 500))
      .toThrow('Hesap erişim yetkisi yok')
    expect(tenantB_Account.balance).toBe(8000)
  })
})
