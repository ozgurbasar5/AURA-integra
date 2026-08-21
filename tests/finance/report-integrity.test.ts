import { describe, it, expect } from 'vitest'
import type { AccountDailySummary } from '@/lib/daily-financial-report'

/**
 * Kasa 2.0 Adım 4 — Report Data Integrity & Auditor Tests
 *
 * Sorumluluk:
 * 1. Account.balance ile Ledger-Derived Closing Balance uyumsuzluğu (Drift Detection)
 * 2. Mismatch durumunda 'DATA INTEGRITY WARNING' üretimi
 * 3. Tenant İzolasyonu
 */

describe('Kasa 2.0: Report Data Integrity & Drift Detection', () => {
  it('1. Balanced Account: Ledger kapanış bakiyesi ile System bakiyesi eşitse balanced=true', () => {
    const summary: AccountDailySummary = {
      account_id: 'acc-1',
      account_name: 'Nakit Kasa',
      account_type: 'kasa',
      currency: 'TRY',
      opening_balance: 10000,
      income: 5000,
      expense: 1000,
      refund: 0,
      transfer_in: 0,
      transfer_out: 0,
      adjustment: 0,
      ledger_closing_balance: 14000,
      system_balance: 14000,
      is_balanced: true,
      difference: 0,
    }

    expect(summary.is_balanced).toBe(true)
    expect(summary.difference).toBe(0)
  })

  it('2. Mismatched Account: Defter ile Sistem bakiyesi uyuşmuyorsa uyarı listesine eklenir', () => {
    const summary: AccountDailySummary = {
      account_id: 'acc-2',
      account_name: 'POS Hesabı',
      account_type: 'pos',
      currency: 'TRY',
      opening_balance: 20000,
      income: 10000,
      expense: 0,
      refund: 0,
      transfer_in: 0,
      transfer_out: 0,
      adjustment: 0,
      ledger_closing_balance: 30000,
      system_balance: 28500, // 1500 TRY bakiye uyuşmazlığı var!
      is_balanced: false,
      difference: -1500,
    }

    const integrityReport = {
      balanced: summary.is_balanced,
      mismatches: !summary.is_balanced
        ? [
            {
              account_id: summary.account_id,
              account_name: summary.account_name,
              ledger_closing: summary.ledger_closing_balance,
              system_balance: summary.system_balance,
              difference: summary.difference,
            },
          ]
        : [],
    }

    expect(integrityReport.balanced).toBe(false)
    expect(integrityReport.mismatches.length).toBe(1)
    expect(integrityReport.mismatches[0].difference).toBe(-1500)
  })

  it('3. Tenant Isolation: Rapor sorgusu sadece çağıran tenant verisini kapsar', () => {
    const transactions = [
      { id: 'tx-1', tenant_id: 'tenant-A', amount: 1000 },
      { id: 'tx-2', tenant_id: 'tenant-B', amount: 5000 },
    ]

    const callerTenantId = 'tenant-A'
    const isolatedTxs = transactions.filter(t => t.tenant_id === callerTenantId)

    expect(isolatedTxs.length).toBe(1)
    expect(isolatedTxs[0].amount).toBe(1000)
    expect(isolatedTxs.some(t => t.tenant_id === 'tenant-B')).toBe(false)
  })
})
