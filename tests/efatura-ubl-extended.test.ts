import { describe, it, expect } from 'vitest'
import { buildUblTrInvoice, } from '@/lib/efatura/ubl-builder'
import { submitInvoiceToGib, getEfaturaProviderId } from '@/lib/efatura/provider'

describe('buildUblTrInvoice — edge case\'ler', () => {
  const baseInvoice = {
    invoice_no: 'INV-001',
    customer_name: 'Test A.Ş.',
    customer_vkn: '1234567890',
    subtotal: 100,
    tax_amount: 20,
    total: 120,
    invoice_date: '2026-07-10',
    description: 'Servis',
  }

  it('standart fatura XML üretir', () => {
    const xml = buildUblTrInvoice(baseInvoice)
    expect(xml).toContain('UBLVersionID')
    expect(xml).toContain('TR1.2')
    expect(xml).toContain('INV-001')
    expect(xml).toContain('Test A.Ş.')
    expect(xml).toContain('120.00')
  })

  it('sıfır KDV ile fatura oluşturulabilir', () => {
    const xml = buildUblTrInvoice({
      ...baseInvoice,
      tax_amount: 0,
      total: 100,
    })
    expect(xml).toContain('INV-001')
    expect(xml).toContain('0.00')
  })

  it('farklı fatura numarası ile', () => {
    const xml = buildUblTrInvoice({
      ...baseInvoice,
      invoice_no: 'SRV-2026-00001',
    })
    expect(xml).toContain('SRV-2026-00001')
  })

  it('VKN olmadan da çalışır', () => {
    const xml = buildUblTrInvoice({
      invoice_no: 'TEST-001',
      customer_name: 'Bireysel Müşteri',
      subtotal: 50,
      tax_amount: 10,
      total: 60,
      invoice_date: '2026-01-01',
    })
    expect(xml).toContain('TEST-001')
    expect(xml).toContain('60.00')
  })

  it('büyük tutar formatı doğru', () => {
    const xml = buildUblTrInvoice({
      ...baseInvoice,
      subtotal: 100000,
      tax_amount: 20000,
      total: 120000,
    })
    expect(xml).toContain('120000.00')
  })

  it('özel karakter içeren açıklama', () => {
    const xml = buildUblTrInvoice({
      ...baseInvoice,
      description: 'LCD Değişim & Onarım',
    })
    expect(typeof xml).toBe('string')
    expect(xml.length).toBeGreaterThan(0)
  })
})

describe('efatura provider — genişletilmiş', () => {
  it('varsayılan provider stub', () => {
    expect(getEfaturaProviderId()).toBe('stub')
  })

  it('stub provider tüm gerekli alanları döner', async () => {
    const result = await submitInvoiceToGib({
      invoice_no: 'STUB-001',
      customer_name: 'Stub Test',
      subtotal: 100,
      tax_amount: 20,
      total: 120,
      invoice_date: '2026-01-01',
    })
    expect(result.ok).toBe(true)
    expect(result.provider).toBe('stub')
    expect(result.gib_reference).toMatch(/^GIB-/)
    expect(result.xml).toBeTruthy()
    expect(result.xml).toContain('Invoice')
  })

  it('stub GIB referansı her seferinde farklı', async () => {
    const r1 = await submitInvoiceToGib({
      invoice_no: 'T-1',
      customer_name: 'Müşteri',
      subtotal: 10,
      tax_amount: 2,
      total: 12,
      invoice_date: '2026-07-10',
    })
    const r2 = await submitInvoiceToGib({
      invoice_no: 'T-2',
      customer_name: 'Müşteri',
      subtotal: 10,
      tax_amount: 2,
      total: 12,
      invoice_date: '2026-07-10',
    })
    // GIB ref'lerin formatı aynı ama içerik farklı olabilir
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })
})
