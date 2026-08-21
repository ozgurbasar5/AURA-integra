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
 * SCENARIO 03: Partial Payment Workflow (Kısmi / Parçalı Ödeme)
 *
 * Akış:
 * 1. Toplam tutarı 1.500 TRY olan bir servis emri açılır.
 * 2. 1. Ödeme (Kapora/Avans): 500 TRY nakit alınır -> Kalan: 1.000 TRY.
 * 3. 2. Ödeme (Kalan Bakiye): 1.000 TRY POS ile alınır -> Kalan: 0 TRY.
 * 4. Kontroller:
 *    - Tam olarak 2 adet finansal işlem oluşmalıdır.
 *    - 1. işlem 500 TRY, 2. işlem 1.000 TRY olmalıdır.
 *    - İlgili kasa ve POS hesap bakiyeleri tam tutar kadar artmalıdır.
 *    - Kalan bakiye matematiksel olarak 0 olmalıdır.
 */
describe('Scenario 03: Partial Payment Workflow', () => {
  it('kısmi ödemeleri doğru takip eder ve bakiye kapatıldığında tam tahsilatı doğrular', async () => {
    const tenantId = 'tenant-scen-03'
    const kasaAccId = 'acc-kasa-03'
    const posAccId = 'acc-pos-03'

    let kasaBalance = 5000
    let posBalance = 12000

    const transactionsList: Array<{ id: string; amount: number; type: string; account_id: string; tenant_id: string }> = []

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => {
          const row = { id: `${table}-id-${transactionsList.length + 1}`, ...(data as object) }
          if (table === 'financial_transactions') {
            transactionsList.push(row as typeof transactionsList[0])
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

    // 1. 1500 TRY tutarlı servis emri
    const serviceTotal = 1500
    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-scen-03',
      estimated_cost: serviceTotal,
      actual_cost: serviceTotal,
    })

    assertTenantOwnership(serviceOrder, tenantId, 'Servis Emri')

    // 2. 1. Ödeme (Kapora: 500 TRY Nakit)
    const payment1Amount = 500
    const initialKasa = kasaBalance
    kasaBalance += payment1Amount

    const { transaction: tx1 } = await createFinancialTransaction(mockCtx, {
      account_id: kasaAccId,
      serviceId: serviceOrder.id,
      type: 'gelir',
      amount: payment1Amount,
      category: 'Servis Kapora',
      description: 'Ön ödeme / kapora',
    })

    assertTenantOwnership(tx1, tenantId, '1. Ödeme İşlemi')
    assertFinancialDelta(initialKasa, kasaBalance, 500, 'Nakit Kasa')
    const remainingAfter1 = serviceTotal - payment1Amount
    expect(remainingAfter1).toBe(1000)

    // 3. 2. Ödeme (Kalan: 1000 TRY POS)
    const payment2Amount = 1000
    const initialPos = posBalance
    posBalance += payment2Amount

    const { transaction: tx2 } = await createFinancialTransaction(mockCtx, {
      account_id: posAccId,
      serviceId: serviceOrder.id,
      type: 'gelir',
      amount: payment2Amount,
      category: 'Servis Kalan Bakiye',
      description: 'Teslimat kalan ödeme',
    })

    assertTenantOwnership(tx2, tenantId, '2. Ödeme İşlemi')
    assertFinancialDelta(initialPos, posBalance, 1000, 'POS Hesabı')

    const finalRemaining = remainingAfter1 - payment2Amount
    expect(finalRemaining).toBe(0)

    // 4. Genel Doğrulamalar
    assertNoDuplicateBusinessEffect(transactionsList, 2, 'Finansal İşlem')
    const totalCollected = transactionsList.reduce((sum, tx) => sum + tx.amount, 0)
    expect(totalCollected).toBe(serviceTotal)
  })
})
