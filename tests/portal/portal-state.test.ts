import { describe, it, expect } from 'vitest'
import { mapDbOrderToCustomerSafeOrder, mapDbWarrantyToCustomerSafeWarranty } from '@/lib/portal-dto'

describe('Portal 2.0 State Invariants', () => {
  it('correctly maps order statuses to public timeline steps', () => {
    const statuses = [
      { db: 'alindi', stepIdx: 0, publicLabel: 'Teslim Alındı' },
      { db: 'teshis', stepIdx: 1, publicLabel: 'Teşhis' },
      { db: 'onay_bekleniyor', stepIdx: 2, publicLabel: 'Onay Bekleniyor' },
      { db: 'tamir', stepIdx: 3, publicLabel: 'Onarım' },
      { db: 'kalite_kontrol', stepIdx: 4, publicLabel: 'Teslime Hazır' },
      { db: 'teslime_hazir', stepIdx: 4, publicLabel: 'Teslime Hazır' },
      { db: 'teslim', stepIdx: 5, publicLabel: 'Teslim Edildi' },
    ]

    for (const s of statuses) {
      const dto = mapDbOrderToCustomerSafeOrder({
        id: 'ord-test',
        order_no: 'SRV-001',
        status: s.db,
        created_at: new Date().toISOString(),
      })

      expect(dto.timeline_step_index).toBe(s.stepIdx)
      expect(dto.timeline.length).toBe(6)
      // Check that steps up to current are marked completed
      expect(dto.timeline[s.stepIdx].current).toBe(true)
      expect(dto.timeline[0].completed).toBe(true)
    }
  })

  it('correctly derives quote and payment state', () => {
    const orderWithPartialPayment = {
      id: 'ord-2',
      order_no: 'SRV-002',
      status: 'tamir',
      actual_cost: 2000,
      paid_amount: 500,
      labor_fee: 600,
      parts_client_total: 1400,
    }

    const dto = mapDbOrderToCustomerSafeOrder(orderWithPartialPayment)

    expect(dto.quote.grand_total).toBe(2000)
    expect(dto.quote.labor_total).toBe(600)
    expect(dto.quote.parts_total).toBe(1400)
    expect(dto.payment.paid_amount).toBe(500)
    expect(dto.payment.remaining_amount).toBe(1500)
    expect(dto.payment.status).toBe('partial')
  })

  it('correctly derives warranty days remaining and status', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 45)

    const activeWarranty = {
      id: 'w-1',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
      start_date: new Date().toISOString(),
      end_date: futureDate.toISOString(),
      warranty_months: 6,
      status: 'aktif',
    }

    const dto = mapDbWarrantyToCustomerSafeWarranty(activeWarranty)
    expect(dto.status).toBe('aktif')
    expect(dto.days_remaining).toBeGreaterThanOrEqual(44)
    expect(dto.days_remaining).toBeLessThanOrEqual(46)

    // Expired warranty
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)

    const expiredWarranty = {
      id: 'w-2',
      device_brand: 'Samsung',
      device_model: 'A52',
      start_date: new Date(Date.now() - 180 * 86400000).toISOString(),
      end_date: pastDate.toISOString(),
      warranty_months: 6,
      status: 'aktif',
    }

    const expiredDto = mapDbWarrantyToCustomerSafeWarranty(expiredWarranty)
    expect(expiredDto.status).toBe('dolmus')
    expect(expiredDto.days_remaining).toBe(0)
  })
})
