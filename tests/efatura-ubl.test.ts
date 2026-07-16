import { describe, it, expect } from 'vitest'
import { buildUblTrInvoice } from '@/lib/efatura/ubl-builder'
import { submitInvoiceToGib, getEfaturaProviderId } from '@/lib/efatura/provider'

describe('ubl-builder', () => {
  it('produces UBL-TR XML with invoice fields', () => {
    const xml = buildUblTrInvoice({
      invoice_no: 'INV-001',
      customer_name: 'Test A.Ş.',
      customer_vkn: '1234567890',
      subtotal: 100,
      tax_amount: 20,
      total: 120,
      invoice_date: '2026-07-10',
      description: 'Servis',
    })
    expect(xml).toContain('UBLVersionID')
    expect(xml).toContain('TR1.2')
    expect(xml).toContain('INV-001')
    expect(xml).toContain('Test A.Ş.')
    expect(xml).toContain('120.00')
  })
})

describe('efatura provider stub', () => {
  it('defaults to stub and returns fake GIB ref + xml', async () => {
    expect(getEfaturaProviderId()).toBe('stub')
    const result = await submitInvoiceToGib({
      invoice_no: 'T-1',
      customer_name: 'Müşteri',
      subtotal: 10,
      tax_amount: 2,
      total: 12,
      invoice_date: '2026-07-10',
    })
    expect(result.ok).toBe(true)
    expect(result.provider).toBe('stub')
    expect(result.gib_reference).toMatch(/^GIB-/)
    expect(result.xml).toContain('Invoice')
  })
})
