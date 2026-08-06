import { describe, it, expect } from 'vitest'
import {
  mapDbStatusToPublic,
  mapStoreStatusToPublic,
  mapDbStatusToStore,
  PUBLIC_STATUS_LABELS,
  QC_CHECKLIST,
  isQcComplete,
  qcProgress,
  renderTemplate,
  findRepeatRepairs,
  calcTechnicianCommissions,
  buildVatReport,
  generateToken,
} from '@/lib/erp-features'

describe('durum dönüşümleri', () => {
  it('DB durumu → public etiket', () => {
    expect(mapDbStatusToPublic('alindi')).toBe('alindi')
    expect(mapDbStatusToPublic('tamir')).toBe('tamir')
    expect(mapDbStatusToPublic('teslim')).toBe('teslim')
    expect(mapDbStatusToPublic('iptal')).toBe('iptal')
  })

  it('store durumu → public', () => {
    expect(mapStoreStatusToPublic('waiting_diagnosis')).toBe('alindi')
    expect(mapStoreStatusToPublic('in_repair')).toBe('tamir')
    expect(mapStoreStatusToPublic('delivered')).toBe('teslim')
    expect(mapStoreStatusToPublic('cancelled')).toBe('iptal')
  })

  it('DB → store dönüşümü', () => {
    expect(mapDbStatusToStore('alindi')).toBe('waiting_diagnosis')
    expect(mapDbStatusToStore('tamir')).toBe('in_repair')
    expect(mapDbStatusToStore('teslim')).toBe('delivered')
  })

  it('bilinmeyen durum olduğu gibi döner', () => {
    expect(mapStoreStatusToPublic('bilinmeyen_durum')).toBe('bilinmeyen_durum')
  })
})

describe('PUBLIC_STATUS_LABELS', () => {
  it('temel durum etiketleri var', () => {
    expect(PUBLIC_STATUS_LABELS['alindi']).toBeTruthy()
    expect(PUBLIC_STATUS_LABELS['teslim']).toBeTruthy()
    expect(PUBLIC_STATUS_LABELS['iptal']).toBeTruthy()
    expect(PUBLIC_STATUS_LABELS['tamir']).toBeTruthy()
  })
})

describe('QC kontrol listesi', () => {
  it('en az 5 kontrol maddesi var', () => {
    expect(QC_CHECKLIST.length).toBeGreaterThanOrEqual(5)
  })
})

describe('isQcComplete', () => {
  it('boş dizi → tamamlanmamış', () => {
    expect(isQcComplete([])).toBe(false)
    expect(isQcComplete(undefined)).toBe(false)
  })

  it('tüm maddeler tamamlanırsa → true', () => {
    expect(isQcComplete([...QC_CHECKLIST])).toBe(true)
  })

  it('eksik madde varsa → false', () => {
    expect(isQcComplete([QC_CHECKLIST[0]])).toBe(false)
  })
})

describe('qcProgress', () => {
  it('hiç yapılmamış → 0', () => {
    const { done, total } = qcProgress([])
    expect(done).toBe(0)
    expect(total).toBe(QC_CHECKLIST.length)
  })

  it('tamamlanmış → done === total', () => {
    const { done, total } = qcProgress([...QC_CHECKLIST])
    expect(done).toBe(total)
  })

  it('kısmi tamamlama', () => {
    const { done } = qcProgress([QC_CHECKLIST[0], QC_CHECKLIST[1]])
    expect(done).toBe(2)
  })
})

describe('renderTemplate', () => {
  it('değişkenleri yerine koyar', () => {
    const result = renderTemplate('Sayın {name}, {device} cihazınız hazır.', {
      name: 'Ali',
      device: 'iPhone',
    })
    expect(result).toBe('Sayın Ali, iPhone cihazınız hazır.')
  })

  it('bilinmeyen değişkeni olduğu gibi bırakır', () => {
    const result = renderTemplate('{bilinmeyen}', {})
    expect(result).toContain('bilinmeyen')
  })

  it('sayı değerleri de çalışır', () => {
    const result = renderTemplate('{price} TL', { price: 1500 })
    expect(result).toBe('1500 TL')
  })
})

describe('findRepeatRepairs', () => {
  const now = new Date()
  const recent = new Date(now.getTime() - 10 * 86400000).toISOString()
  const old = new Date(now.getTime() - 60 * 86400000).toISOString()

  it('aynı IMEI 30 gün içinde tekrar gelirse hit döner', () => {
    const orders = [
      { id: '1', imei: '490154203237518', customer_name: 'Ali', job_no: 'SRV-001', created_at: now.toISOString(), status: 'alindi' },
      { id: '2', imei: '490154203237518', customer_name: 'Ali', job_no: 'SRV-002', created_at: recent, status: 'teslim' },
    ]
    const hits = findRepeatRepairs(orders)
    expect(hits.length).toBe(1)
    expect(hits[0].imei).toBe('490154203237518')
  })

  it('30 günden eski kayıt → hit yok', () => {
    const orders = [
      { id: '1', imei: '490154203237518', customer_name: 'Ali', job_no: 'SRV-001', created_at: now.toISOString(), status: 'alindi' },
      { id: '2', imei: '490154203237518', customer_name: 'Ali', job_no: 'SRV-002', created_at: old, status: 'teslim' },
    ]
    const hits = findRepeatRepairs(orders)
    expect(hits.length).toBe(0)
  })

  it('farklı IMEI → hit yok', () => {
    const orders = [
      { id: '1', imei: '490154203237518', customer_name: 'Ali', job_no: 'SRV-001', created_at: now.toISOString(), status: 'alindi' },
      { id: '2', imei: '111222333444555', customer_name: 'Veli', job_no: 'SRV-002', created_at: recent, status: 'teslim' },
    ]
    const hits = findRepeatRepairs(orders)
    expect(hits.length).toBe(0)
  })

  it('IMEI olmayan kayıtlar dikkate alınmaz', () => {
    const orders = [
      { id: '1', imei: '', customer_name: 'Ali', job_no: 'SRV-001', created_at: now.toISOString(), status: 'alindi' },
      { id: '2', imei: '', customer_name: 'Ali', job_no: 'SRV-002', created_at: recent, status: 'teslim' },
    ]
    const hits = findRepeatRepairs(orders)
    expect(hits.length).toBe(0)
  })
})

describe('calcTechnicianCommissions', () => {
  const orders = [
    { technician: 'Ahmet', status: 'teslim', estimated_cost: 1000, actual_cost: 1000 },
    { technician: 'Ahmet', status: 'teslim', estimated_cost: 500, actual_cost: 500 },
    { technician: 'Mehmet', status: 'teslim', estimated_cost: 800, actual_cost: 800 },
    { technician: 'Ahmet', status: 'alindi', estimated_cost: 200 }, // teslim edilmedi
  ]
  const personnel = [
    { full_name: 'Ahmet', commission_rate: 10, is_active: true },
    { full_name: 'Mehmet', commission_rate: 15, is_active: true },
  ]

  it('teslim edilen iş emirleri için komisyon hesaplar', () => {
    const result = calcTechnicianCommissions(orders, personnel)
    const ahmet = result.find(r => r.name === 'Ahmet')
    expect(ahmet).toBeTruthy()
    expect(ahmet!.delivered_count).toBe(2)
    expect(ahmet!.revenue).toBe(1500)
    expect(ahmet!.commission_amount).toBeCloseTo(150, 1)
  })

  it('teslim edilmeyen iş emirleri dahil edilmez', () => {
    const result = calcTechnicianCommissions(orders, personnel)
    const ahmet = result.find(r => r.name === 'Ahmet')
    expect(ahmet!.revenue).toBe(1500) // 200 dahil değil
  })

  it('personelde olmayan teknisyen için varsayılan oran kullanılır', () => {
    const unkOrders = [
      { technician: 'Bilinmeyen', status: 'teslim', estimated_cost: 1000, actual_cost: 1000 },
    ]
    const result = calcTechnicianCommissions(unkOrders, personnel, 5)
    const row = result.find(r => r.name === 'Bilinmeyen')
    expect(row!.commission_rate).toBe(5)
    expect(row!.commission_amount).toBeCloseTo(50, 1)
  })

  it('azalan komisyon sırası', () => {
    const result = calcTechnicianCommissions(orders, personnel)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].commission_amount).toBeGreaterThanOrEqual(result[i + 1].commission_amount)
    }
  })
})

describe('buildVatReport', () => {
  it('satış + servis KDV raporu üretir', () => {
    const txs = [
      { type: 'gelir', amount: 1200, category: 'Servis Teslim', date: '2026-01-01', payment_method: 'nakit' },
    ] as never[]
    const sales = [{ subtotal: 100, vat_amount: 20, total_with_vat: 120, date: '2026-01-01' }]
    const report = buildVatReport(txs, sales)
    expect(report.rows.length).toBeGreaterThanOrEqual(1)
    expect(report.totalVat).toBeGreaterThan(0)
    expect(report.totalGross).toBeGreaterThan(0)
  })

  it('boş veri → sıfır toplam', () => {
    const report = buildVatReport([], [])
    expect(report.totalVat).toBe(0)
    expect(report.rows.length).toBe(0)
  })
})

describe('generateToken', () => {
  it('16 karakter döner', () => {
    const token = generateToken()
    expect(token.length).toBe(16)
  })

  it('her seferinde farklı token üretir', () => {
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).not.toBe(t2)
  })
})
