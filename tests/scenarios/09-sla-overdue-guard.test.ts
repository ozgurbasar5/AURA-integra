import { describe, it, expect } from 'vitest'
import { getSlaStatus, isSlaBreached } from '@/lib/sla-engine'
import type { SlaConfig, StoreServiceOrder } from '@/lib/store'

/**
 * SCENARIO 09: SLA Target & Overdue Evaluation Workflow (SLA Takibi)
 *
 * Akış:
 * 1. Servis iş emri oluşturulur ve SLA hedef süresi belirlenir (standard_days: 3 gün).
 * 2. Yeni açılan iş emri (1 gün önce): SLA durumu 'ok' olarak değerlendirilir.
 * 3. Süresi yaklaşan iş emri (%75+ süre geçti, 2.5 gün): SLA durumu 'warning' olarak değerlendirilir.
 * 4. Süresi aşılmış iş emri (5 gün geçti): SLA durumu 'breached' (gecikmiş) olarak işaretlenir.
 * 5. Tamamlanmış iş emri: 'completed' olarak işaretlenir.
 * 6. Onay/Parça bekleyen iş emri: 'paused' olarak duraklatılır.
 */
describe('Scenario 09: SLA Target & Overdue Evaluation', () => {
  const config: SlaConfig = {
    id: 'sla-cfg-1',
    tenant_id: 't-1',
    category: 'Akıllı Telefon',
    standard_days: 3,
    legal_max_days: 20,
    warning_at_percent: 75,
    is_active: true,
    escalation_roles: [],
    auto_notify_customer: false,
    created_at: new Date().toISOString(),
  }

  it('SLA süresi içindeki açık servisleri zamanında (ok) olarak tespit eder', () => {
    const order = {
      id: 'order-1',
      status: 'islem_goruyor',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 gün önce
    } as StoreServiceOrder

    const status = getSlaStatus(order, config)
    expect(status).toBe('ok')
    expect(isSlaBreached(order, config)).toBe(false)
  })

  it('SLA uyarı eşiğini aşan servisleri (warning) olarak tespit eder', () => {
    const order = {
      id: 'order-2',
      status: 'islem_goruyor',
      created_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(), // %83 süre geçti
    } as StoreServiceOrder

    const status = getSlaStatus(order, config)
    expect(status).toBe('warning')
    expect(isSlaBreached(order, config)).toBe(false)
  })

  it('SLA süresi aşılmış servisleri gecikmiş (breached) olarak tespit eder', () => {
    const order = {
      id: 'order-3',
      status: 'islem_goruyor',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 gün geçti
    } as StoreServiceOrder

    const status = getSlaStatus(order, config)
    expect(status).toBe('breached')
    expect(isSlaBreached(order, config)).toBe(true)
  })

  it('teslim edilmiş iş emrinde SLA durumunu completed olarak kapatır', () => {
    const order = {
      id: 'order-4',
      status: 'teslim_edildi',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    } as StoreServiceOrder

    const status = getSlaStatus(order, config)
    expect(status).toBe('completed')
    expect(isSlaBreached(order, config)).toBe(false)
  })

  it('onay veya parça bekleyen servislerde SLA sayacını duraklatır (paused)', () => {
    const order = {
      id: 'order-5',
      status: 'onay_bekliyor',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    } as StoreServiceOrder

    const status = getSlaStatus(order, config)
    expect(status).toBe('paused')
    expect(isSlaBreached(order, config)).toBe(false)
  })
})

