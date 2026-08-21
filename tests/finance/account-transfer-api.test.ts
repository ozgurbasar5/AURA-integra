import { describe, it, expect } from 'vitest'

/**
 * Kasa 2.0 Adım 2 — Account Transfer API Test Suite
 *
 * POST /api/tenant/accounts/transfer
 * Validation, security, zero-sum invariant
 */

interface TransferRequest {
  source_account_id: string
  target_account_id: string
  amount: number
  description?: string
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function validateTransfer(body: Partial<TransferRequest>, callerTenantId: string, accounts: Map<string, { tenant_id: string; is_active: boolean; balance: number }>) {
  if (!body.source_account_id || !isUuid(body.source_account_id)) throw new Error('source_account_id geçerli UUID olmalı')
  if (!body.target_account_id || !isUuid(body.target_account_id)) throw new Error('target_account_id geçerli UUID olmalı')
  if (body.source_account_id === body.target_account_id) throw new Error('Kaynak ve hedef hesap aynı olamaz')

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Tutar pozitif olmalıdır')
  if (amount > 10_000_000) throw new Error('Tutar çok büyük')

  const src = accounts.get(body.source_account_id)
  if (!src) throw new Error('Kaynak hesap bulunamadı')
  if (src.tenant_id !== callerTenantId) throw new Error('Kaynak hesap bu tenant\'a ait değil')
  if (!src.is_active) throw new Error('Kaynak hesap pasif')

  const tgt = accounts.get(body.target_account_id)
  if (!tgt) throw new Error('Hedef hesap bulunamadı')
  if (tgt.tenant_id !== callerTenantId) throw new Error('Hedef hesap bu tenant\'a ait değil')
  if (!tgt.is_active) throw new Error('Hedef hesap pasif')

  return true
}

describe('Kasa 2.0: Account Transfer API Validation', () => {
  const tenantAccounts = new Map<string, { tenant_id: string; is_active: boolean; balance: number }>([
    ['11111111-1111-1111-1111-111111111111', { tenant_id: 't1', is_active: true, balance: 5000 }],
    ['22222222-2222-2222-2222-222222222222', { tenant_id: 't1', is_active: true, balance: 10000 }],
    ['33333333-3333-3333-3333-333333333333', { tenant_id: 't1', is_active: false, balance: 0 }],
    ['44444444-4444-4444-4444-444444444444', { tenant_id: 't2', is_active: true, balance: 3000 }],
  ])

  it('1. Geçerli transfer kabul edilir', () => {
    expect(validateTransfer({
      source_account_id: '11111111-1111-1111-1111-111111111111',
      target_account_id: '22222222-2222-2222-2222-222222222222',
      amount: 1000,
    }, 't1', tenantAccounts)).toBe(true)
  })

  it('2. source = target → reddedilir', () => {
    expect(() => validateTransfer({
      source_account_id: '11111111-1111-1111-1111-111111111111',
      target_account_id: '11111111-1111-1111-1111-111111111111',
      amount: 1000,
    }, 't1', tenantAccounts)).toThrow('Kaynak ve hedef hesap aynı')
  })

  it('3. Negatif tutar → reddedilir', () => {
    expect(() => validateTransfer({
      source_account_id: '11111111-1111-1111-1111-111111111111',
      target_account_id: '22222222-2222-2222-2222-222222222222',
      amount: -500,
    }, 't1', tenantAccounts)).toThrow('Tutar pozitif')
  })

  it('4. Cross-tenant transfer → reddedilir', () => {
    expect(() => validateTransfer({
      source_account_id: '11111111-1111-1111-1111-111111111111',
      target_account_id: '44444444-4444-4444-4444-444444444444',
      amount: 1000,
    }, 't1', tenantAccounts)).toThrow('Hedef hesap bu tenant\'a ait değil')
  })

  it('5. Pasif kaynak hesap → reddedilir', () => {
    expect(() => validateTransfer({
      source_account_id: '33333333-3333-3333-3333-333333333333',
      target_account_id: '22222222-2222-2222-2222-222222222222',
      amount: 500,
    }, 't1', tenantAccounts)).toThrow('Kaynak hesap pasif')
  })

  it('6. Geçersiz UUID → reddedilir', () => {
    expect(() => validateTransfer({
      source_account_id: 'invalid',
      target_account_id: '22222222-2222-2222-2222-222222222222',
      amount: 500,
    }, 't1', tenantAccounts)).toThrow('source_account_id geçerli UUID')
  })

  it('7. Çok büyük tutar → reddedilir', () => {
    expect(() => validateTransfer({
      source_account_id: '11111111-1111-1111-1111-111111111111',
      target_account_id: '22222222-2222-2222-2222-222222222222',
      amount: 99_999_999,
    }, 't1', tenantAccounts)).toThrow('Tutar çok büyük')
  })
})
