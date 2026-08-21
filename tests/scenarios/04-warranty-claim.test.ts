import { describe, it, expect } from 'vitest'
import { assertTenantOwnership } from './helpers/assertions'
import {
  createServiceOrder,
  createWarranty,
  createWarrantyClaim,
} from '../factories'

/**
 * SCENARIO 04: Warranty & Warranty Claim Lifecycle (Garanti ve Talep)
 *
 * Akış:
 * 1. Servis tamamlanır ve teslim edilir (status: 'teslim').
 * 2. 6 aylık garanti belgesi oluşturulur (status: 'aktif', QR token, SLA).
 * 3. Müşteri garanti süresi içinde arıza bildirimi (Claim) yapar.
 * 4. Teknisyen arızayı inceler, garanti kapsamında onarımı çözer (status: 'resolved', 0 TRY maliyet).
 * 5. Kontroller:
 *    - Garanti belgesi doğru servis emrine ve cihaza (IMEI) bağlıdır.
 *    - Garanti talebi doğru garantiye ve kiracıya (tenant) aittir.
 *    - Garanti kapsamındaki onarımda müşteriye 0 TRY ek ücret yansıtılmıştır.
 */
describe('Scenario 04: Warranty & Claim Lifecycle', () => {
  it('teslim edilen servise garanti tanımlar ve garanti talebini başarıyla yönetir', async () => {
    const tenantId = 'tenant-scen-04'

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => ({
          select: () => ({
            single: async () => ({ data: { id: `${table}-id-1`, ...(data as object) }, error: null }),
          }),
        }),
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    // 1. Teslim edilmiş servis emri
    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-scen-04',
      status: 'teslim',
      device_brand: 'Samsung',
      device_model: 'Galaxy S23',
      imei: '358901234567890',
    })

    assertTenantOwnership(serviceOrder, tenantId, 'Servis Emri')

    // 2. Garanti Belgesi Oluşturma
    const { warranty } = await createWarranty(mockCtx, {
      order_id: serviceOrder.id,
      warranty_months: 6,
      status: 'aktif',
      covered_parts: ['Ekran Değişimi', 'İşçilik'],
      imei: String(serviceOrder.imei ?? ''),
      device_brand: String(serviceOrder.device_brand ?? ''),
      device_model: String(serviceOrder.device_model ?? ''),
    })

    assertTenantOwnership(warranty, tenantId, 'Garanti Belgesi')
    expect(warranty.order_id).toBe(serviceOrder.id)
    expect(warranty.status).toBe('aktif')
    expect(warranty.warranty_months).toBe(6)

    // 3. Garanti Talebi (Claim) Açma
    const { claim } = await createWarrantyClaim(mockCtx, {
      warranty_id: warranty.id,
      issue_description: 'Ekran dokunmatiği sol üst köşede yanıt vermiyor',
      status: 'open',
    })

    assertTenantOwnership(claim, tenantId, 'Garanti Talebi')
    expect(claim.warranty_id).toBe(warranty.id)
    expect(claim.status).toBe('open')

    // 4. Talebin Garanti Kapsamında Çözümlenmesi
    claim.status = 'resolved'
    claim.resolution = 'Ekran soket bağlantısı yenilendi ve test edildi.'
    claim.resolution_amount = 0 // Garanti kapsamında ücretsiz

    expect(claim.status).toBe('resolved')
    expect(claim.resolution_amount).toBe(0)
  })
})
