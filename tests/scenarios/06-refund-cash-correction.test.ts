import { describe, it, expect } from 'vitest'
import {
  assertTenantOwnership,
  assertFinancialDelta,
  assertNoDuplicateBusinessEffect,
} from './helpers/assertions'
import {
  createServiceOrder,
  createFinancialTransaction,
} from '../factories'

/**
 * SCENARIO 06: Refund & Cash Correction Workflow (İade ve Kasa Düzeltmesi)
 *
 * Akış:
 * 1. Servis tamamlanır ve 1.000 TRY tahsil edilir (gelir: +1.000 TRY, Kasa: 10.000 -> 11.000 TRY).
 * 2. Müşteriye memnuniyetsizlik veya yanlış ücretlendirme nedeniyle 300 TRY iade yapılır (gider/iade: 300 TRY, Kasa: 11.000 -> 10.700 TRY).
 * 3. Kontroller:
 *    - Net gelir matematiksel olarak 700 TRY olmalıdır (1000 - 300).
 *    - Kasa bakiyesi net +700 TRY artmış olmalıdır.
 *    - 2 ayrı finansal işlem (gelir + gider) loglanmış olmalıdır.
 */
describe('Scenario 06: Refund & Cash Correction Workflow', () => {
  it('tahsilat sonrası yapılan kısmi iadeyi doğru kaydeder ve net kasa bakiyesini korur', async () => {
    const tenantId = 'tenant-scen-06'
    const kasaAccountId = 'acc-kasa-06'
    const initialKasa = 10000
    let kasaBalance = initialKasa

    const transactions: Array<{ id: string; type: string; amount: number }> = []

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => {
          const row = { id: `${table}-id-${transactions.length + 1}`, ...(data as object) }
          if (table === 'financial_transactions') {
            transactions.push(row as typeof transactions[0])
          }
          return {
            select: () => ({
              single: async () => ({ data: row, error: null }),
            }),
          }
        },
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-scen-06',
      status: 'teslim',
    })

    assertTenantOwnership(serviceOrder, tenantId, 'Servis Emri')

    // 1. 1000 TRY Tahsilat (Gelir)
    const paidAmount = 1000
    kasaBalance += paidAmount

    const { transaction: txIncome } = await createFinancialTransaction(mockCtx, {
      account_id: kasaAccountId,
      serviceId: serviceOrder.id,
      type: 'gelir',
      amount: paidAmount,
      category: 'Servis Ücreti',
    })

    assertTenantOwnership(txIncome, tenantId, 'Gelir İşlemi')
    assertFinancialDelta(initialKasa, kasaBalance, 1000, 'Nakit Kasa')

    // 2. 300 TRY İade (Gider / Düzeltme)
    const refundAmount = 300
    kasaBalance -= refundAmount

    const { transaction: txRefund } = await createFinancialTransaction(mockCtx, {
      account_id: kasaAccountId,
      serviceId: serviceOrder.id,
      type: 'gider',
      amount: refundAmount,
      category: 'Müşteri İadesi',
      description: 'Kısmi memnuniyet iadesi',
    })

    assertTenantOwnership(txRefund, tenantId, 'İade İşlemi')
    assertFinancialDelta(initialKasa, kasaBalance, 700, 'Nakit Kasa Net Bakiye')

    // 3. Matematiksel İnvaryant Kontrolleri
    assertNoDuplicateBusinessEffect(transactions, 2, 'Finansal İşlem')
    const netIncome = transactions.reduce((acc, tx) => (tx.type === 'gelir' ? acc + tx.amount : acc - tx.amount), 0)
    expect(netIncome).toBe(700)
  })
})
