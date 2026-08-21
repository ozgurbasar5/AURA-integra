import { describe, it, expect } from 'vitest'
import { mapDbOrderToCustomerSafeOrder, mapDbWarrantyToCustomerSafeWarranty } from '@/lib/portal-dto'
import { createPortalSessionToken, verifyPortalSessionToken } from '@/lib/portal-session'

describe('Portal 2.0 Security & Privacy Whitelist', () => {
  it('strictly strips internal technician notes, buy price, supplier costs, and margins from customer DTO', () => {
    const rawSensitiveOrder = {
      id: 'ord-123',
      tenant_id: 'tenant-1',
      order_no: 'SRV-2026-0099',
      device_brand: 'Apple',
      device_model: 'iPhone 14 Pro',
      status: 'tamir',
      estimated_cost: 3500,
      actual_cost: 3500,
      // SENSITIVE INTERNAL DATA:
      technician_notes: 'Internal secret note: customer was demanding. Screen purchased from Supplier ABC for 1200 TL.',
      buy_price: 1200,
      parts_cost: 1200,
      supplier_cost: 1200,
      supplier_name: 'Özpolat Toptan',
      margin: 2300,
      profit: 2300,
      technician_salary: 25000,
      created_by: 'user-internal-guid',
      fault_description: 'Ekran kırık ve dokunmatik basmıyor.',
      customer_name: 'Mehmet Demir',
      customer_phone: '05339876543',
      customers: { full_name: 'Mehmet Demir', phone: '05339876543' },
    }

    const safeDto = mapDbOrderToCustomerSafeOrder(rawSensitiveOrder)

    // Verify safe fields are present
    expect(safeDto.order_no).toBe('SRV-2026-0099')
    expect(safeDto.device_brand).toBe('Apple')
    expect(safeDto.device_model).toBe('iPhone 14 Pro')
    expect(safeDto.fault_description).toBe('Ekran kırık ve dokunmatik basmıyor.')
    expect(safeDto.customer_phone_masked).toBe('053***6543')

    // Verify sensitive properties are NOT in the DTO object
    const dtoRecord = safeDto as Record<string, unknown>
    expect(dtoRecord.technician_notes).toBeUndefined()
    expect(dtoRecord.buy_price).toBeUndefined()
    expect(dtoRecord.parts_cost).toBeUndefined()
    expect(dtoRecord.supplier_cost).toBeUndefined()
    expect(dtoRecord.supplier_name).toBeUndefined()
    expect(dtoRecord.profit).toBeUndefined()
    expect(dtoRecord.margin).toBeUndefined()
    expect(dtoRecord.technician_salary).toBeUndefined()
    expect(dtoRecord.created_by).toBeUndefined()

    // Ensure raw string dump does not contain sensitive text
    const jsonStr = JSON.stringify(safeDto)
    expect(jsonStr.includes('Supplier ABC')).toBe(false)
    expect(jsonStr.includes('Özpolat Toptan')).toBe(false)
    expect(jsonStr.includes('demanding')).toBe(false)
  })

  it('masks customer phone numbers appropriately', () => {
    const rawOrder = {
      id: 'ord-1',
      order_no: 'SRV-001',
      device_brand: 'Samsung',
      device_model: 'S23',
      customer_phone: '05421234567',
    }

    const safeDto = mapDbOrderToCustomerSafeOrder(rawOrder)
    expect(safeDto.customer_phone_masked).toBe('054***4567')
    expect(safeDto.customer_phone_masked).not.toBe('05421234567')
  })

  it('enforces tenant isolation preventing cross-tenant session hijacking', () => {
    const tenantA = 'tenant-a-uuid'
    const tenantB = 'tenant-b-uuid'

    const tokenForTenantA = createPortalSessionToken({
      tenantId: tenantA,
      customerPhone: '5321112233',
    })

    const attemptOnTenantB = verifyPortalSessionToken(tokenForTenantA, tenantB)
    expect(attemptOnTenantB.ok).toBe(false)
    expect(attemptOnTenantB.error).toContain('Farklı bayi')
  })
})
