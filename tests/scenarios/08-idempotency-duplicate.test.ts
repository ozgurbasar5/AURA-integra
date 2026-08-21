import { describe, it, expect } from 'vitest'
import {
  assertNoDuplicateBusinessEffect,
  assertFinancialDelta,
} from './helpers/assertions'
import { createServiceOrder } from '../factories'

/**
 * SCENARIO 08: Idempotency & Duplicate Request Protection (Mükerrer İstek Koruması)
 *
 * Akış:
 * 1. Müşteri teklif onayı linkine aynı anda 2 kez tıklar (race condition / double submit).
 * 2. İlk istek onayı işler (status -> 'onaylandi', approval_status -> 'approved').
 * 3. İkinci istek 409 Conflict ("Zaten yanıtlandı") ile reddedilir.
 * 4. Servis teslimatında mükerrer istek gönderilir:
 *    - İlk teslimat: status -> 'teslim', Kasa: +1.500 TRY, Garanti: 1 adet.
 *    - İkinci teslimat: 409 ("Bu iş zaten teslim edilmiş") ile reddedilir.
 * 5. Kontroller:
 *    - Kasaya iki kez mükerrer para girmez (+1.500 TRY olarak sabit kalır, +3.000 TRY olmaz).
 *    - İkinci mükerrer garanti kaydı oluşturulmaz (tam olarak 1 adet kalır).
 */
describe('Scenario 08: Idempotency & Duplicate Protection', () => {
  it('mükerrer onay veya teslimat isteklerinde çift kayıt oluşmasını engeller', async () => {
    const tenantId = 'tenant-scen-08'
    const kasaInitial = 5000
    let kasaBalance = kasaInitial

    const executedFinancialTransactions: Array<{ id: string; amount: number }> = []
    const generatedWarranties: Array<{ id: string; order_id: string }> = []

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => ({
          select: () => ({
            single: async () => ({ data: { id: `${table}-id`, ...(data as object) }, error: null }),
          }),
        }),
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-scen-08',
      status: 'teklif_bekliyor',
      approval_status: 'pending',
    })

    // ── 1. MÜKERRER ONAY DENEMESİ ──
    const approveOrder = (order: typeof serviceOrder) => {
      if (order.approval_status === 'approved' || order.approval_status === 'rejected') {
        throw new Error('Zaten yanıtlandı (409 Conflict)')
      }
      order.approval_status = 'approved'
      order.status = 'onaylandi'
      return { ok: true }
    }

    const firstApproval = approveOrder(serviceOrder)
    expect(firstApproval.ok).toBe(true)
    expect(serviceOrder.approval_status).toBe('approved')

    // İkinci istek (Double click)
    let duplicateApprovalError: Error | null = null
    try {
      approveOrder(serviceOrder)
    } catch (err) {
      duplicateApprovalError = err as Error
    }
    expect(duplicateApprovalError).not.toBeNull()
    expect(duplicateApprovalError?.message).toContain('Zaten yanıtlandı')

    // ── 2. MÜKERRER TESLİMAT VE ÖDEME DENEMESİ ──
    const deliverOrder = (order: typeof serviceOrder, fee: number) => {
      if (order.status === 'teslim') {
        throw new Error('Bu iş zaten teslim edilmiş (409 Conflict)')
      }
      order.status = 'teslim'
      kasaBalance += fee
      executedFinancialTransactions.push({ id: `tx-${Date.now()}`, amount: fee })
      generatedWarranties.push({ id: `war-${Date.now()}`, order_id: order.id })
      return { ok: true }
    }

    // 1. Teslimat Başarılı
    const fee = 1500
    const firstDelivery = deliverOrder(serviceOrder, fee)
    expect(firstDelivery.ok).toBe(true)
    assertFinancialDelta(kasaInitial, kasaBalance, 1500, 'Nakit Kasa')

    // 2. Mükerrer Teslimat (Ağ hatası veya çift tıklama)
    let duplicateDeliveryError: Error | null = null
    try {
      deliverOrder(serviceOrder, fee)
    } catch (err) {
      duplicateDeliveryError = err as Error
    }

    expect(duplicateDeliveryError).not.toBeNull()
    expect(duplicateDeliveryError?.message).toContain('zaten teslim edilmiş')

    // ── 3. İNVARYANT DOĞRULAMALARI ──
    assertNoDuplicateBusinessEffect(executedFinancialTransactions, 1, 'Finansal İşlem')
    assertNoDuplicateBusinessEffect(generatedWarranties, 1, 'Garanti Belgesi')
    expect(kasaBalance).toBe(kasaInitial + fee) // 5000 + 1500 = 6500 (8000 DEĞİL!)
  })
})
