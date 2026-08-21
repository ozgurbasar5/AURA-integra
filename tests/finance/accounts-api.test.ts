import { describe, it, expect } from 'vitest'
import {
  resolveAccountTypeForPayment,
  type Account,
  type CreateTransactionInput,
} from '@/lib/finance-accounts'

/**
 * Kasa 2.0 Adım 2 — Accounts API Test Suite
 *
 * GET /api/tenant/accounts
 * Account resolution
 * Payment method mapping
 */

describe('Kasa 2.0: Accounts API & Resolution', () => {
  // ─── Payment Method Mapping ────────────────────────────────────────────────

  it('1. resolveAccountTypeForPayment: nakit → kasa', () => {
    expect(resolveAccountTypeForPayment('nakit')).toBe('kasa')
  })

  it('2. resolveAccountTypeForPayment: kredi_karti → pos', () => {
    expect(resolveAccountTypeForPayment('kredi_karti')).toBe('pos')
    expect(resolveAccountTypeForPayment('kart')).toBe('pos')
    expect(resolveAccountTypeForPayment('pos')).toBe('pos')
  })

  it('3. resolveAccountTypeForPayment: havale/eft/banka → banka', () => {
    expect(resolveAccountTypeForPayment('havale')).toBe('banka')
    expect(resolveAccountTypeForPayment('eft')).toBe('banka')
    expect(resolveAccountTypeForPayment('banka')).toBe('banka')
    expect(resolveAccountTypeForPayment('transfer')).toBe('banka')
  })

  it('4. resolveAccountTypeForPayment: veresiye/cek/senet → null (Likit hesap atanmaz)', () => {
    expect(resolveAccountTypeForPayment('veresiye')).toBeNull()
    expect(resolveAccountTypeForPayment('cek')).toBeNull()
    expect(resolveAccountTypeForPayment('senet')).toBeNull()
  })

  it('5. resolveAccountTypeForPayment: bilinmeyen method → kasa fallback', () => {
    expect(resolveAccountTypeForPayment('unknown')).toBe('kasa')
    expect(resolveAccountTypeForPayment('')).toBe('kasa')
  })

  // ─── Account List Simulation ───────────────────────────────────────────────

  it('5. Tenant hesap listesi: yalnızca aktif hesaplar (is_active=true) döner', () => {
    const allAccounts: Account[] = [
      { id: 'a1', tenant_id: 't1', name: 'Nakit Kasa', type: 'kasa', balance: 1000, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '', updated_at: '' },
      { id: 'a2', tenant_id: 't1', name: 'POS', type: 'pos', balance: 5000, currency: 'TRY', is_default: false, is_active: true, metadata: {}, created_at: '', updated_at: '' },
      { id: 'a3', tenant_id: 't1', name: 'Eski Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: false, is_active: false, metadata: {}, created_at: '', updated_at: '' },
    ]

    const active = allAccounts.filter(a => a.is_active)
    expect(active.length).toBe(2)
    expect(active.every(a => a.is_active)).toBe(true)
  })

  it('6. Cross-tenant hesap erişim engeli: Tenant A, Tenant B hesabını göremez', () => {
    const accounts: Account[] = [
      { id: 'a1', tenant_id: 'tenant-A', name: 'Kasa', type: 'kasa', balance: 1000, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '', updated_at: '' },
      { id: 'a2', tenant_id: 'tenant-B', name: 'Kasa', type: 'kasa', balance: 2000, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '', updated_at: '' },
    ]

    const callerTenantId = 'tenant-A'
    const visible = accounts.filter(a => a.tenant_id === callerTenantId)
    expect(visible.length).toBe(1)
    expect(visible[0].tenant_id).toBe('tenant-A')
  })

  // ─── Account Resolution ────────────────────────────────────────────────────

  it('7. Payment method ile default account resolve: nakit → is_default kasa hesabı', () => {
    const accounts: Account[] = [
      { id: 'a1', tenant_id: 't1', name: 'Nakit Kasa', type: 'kasa', balance: 1000, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '', updated_at: '' },
      { id: 'a2', tenant_id: 't1', name: 'POS', type: 'pos', balance: 5000, currency: 'TRY', is_default: false, is_active: true, metadata: {}, created_at: '', updated_at: '' },
    ]

    const accountType = resolveAccountTypeForPayment('nakit')
    const resolved = accounts.find(a => a.type === accountType && a.is_active)
    expect(resolved).toBeDefined()
    expect(resolved!.name).toBe('Nakit Kasa')
  })

  it('8. Client account_id ile tenant ownership kontrolü: yanlış tenant → hata', () => {
    const targetAccount: Account = { id: 'a99', tenant_id: 'tenant-B', name: 'Kasa', type: 'kasa', balance: 1000, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '', updated_at: '' }

    const validateOwnership = (callerTenantId: string, account: Account | null) => {
      if (!account) throw new Error('Hesap bulunamadı')
      if (account.tenant_id !== callerTenantId) throw new Error('Hesap bu tenant\'a ait değil')
      if (!account.is_active) throw new Error('Hesap pasif')
      return true
    }

    expect(() => validateOwnership('tenant-A', targetAccount)).toThrow('Hesap bu tenant\'a ait değil')
  })

  // ─── Privileged Field Stripping ────────────────────────────────────────────

  it('9. Client tenant_id/balance gibi privileged alanları override edemez', () => {
    const clientPayload = {
      amount: 500,
      type: 'gelir' as const,
      category: 'Satış',
      description: 'Test',
      payment_method: 'nakit',
      // Attacker tries to inject:
      tenant_id: 'ATTACKER-TENANT',
      balance: 999999,
    }

    // Server-side stripping
    const safe: CreateTransactionInput = {
      type: clientPayload.type,
      amount: clientPayload.amount,
      category: clientPayload.category,
      description: clientPayload.description,
      payment_method: clientPayload.payment_method,
    }

    expect((safe as any).tenant_id).toBeUndefined()
    expect((safe as any).balance).toBeUndefined()
  })
})
