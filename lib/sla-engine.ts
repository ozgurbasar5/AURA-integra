import { type SlaConfig, type StoreServiceOrder, type SlaEvent } from './store'
import { getCategoryInfo } from './atolye-constants'

export type SlaStatus = 'ok' | 'warning' | 'breached' | 'completed' | 'paused'

export interface SlaReport {
  total: number
  ok: number
  warning: number
  breached: number
  completed: number
}

/**
 * Başlangıç tarihine (kabul tarihi) standart SLA gününü ekler (iş günü veya takvim günü mantığı)
 * 6502 sayılı kanuna göre azami tamir süresi 20 iş günüdür.
 */
export function calculateSlaDeadline(startDate: string, config: SlaConfig): string {
  const start = new Date(startDate)
  // Basit hesaplama: takvim gününü ekle (gerçek bir sistemde iş günü hesaplanabilir)
  const deadline = new Date(start.getTime() + config.standard_days * 24 * 60 * 60 * 1000)
  return deadline.toISOString()
}

/**
 * Siparişin SLA durumunu hesaplar.
 */
export function getSlaStatus(order: StoreServiceOrder, config: SlaConfig): SlaStatus {
  // Tamamlandıysa SLA statusu 'completed'
  if (['teslim_edildi', 'iptal_edildi', 'iade_edildi'].includes(order.status)) {
    return 'completed'
  }
  
  // Parça bekleniyor gibi durumlarda 'paused' sayılabilir
  if (order.status === 'parca_bekliyor' || order.status === 'onay_bekliyor') {
    // Kurumsal kurallara göre onay beklerken SLA duraklatılır
    return 'paused'
  }

  const now = new Date()
  const start = new Date(order.created_at)
  
  const elapsedDays = (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  
  if (elapsedDays > config.legal_max_days) {
    return 'breached'
  }
  
  if (elapsedDays > config.standard_days) {
    return 'breached'
  }

  const limitPercent = (elapsedDays / config.standard_days) * 100
  if (limitPercent >= config.warning_at_percent) {
    return 'warning'
  }

  return 'ok'
}

/**
 * SLA ihlali olup olmadığını döndürür
 */
export function isSlaBreached(order: StoreServiceOrder, config: SlaConfig): boolean {
  return getSlaStatus(order, config) === 'breached'
}

/**
 * 6502 Sayılı Tüketicinin Korunması Hakkında Kanun uyarısı
 */
export function getLegalDeadlineText(category: string): string {
  // Genel kanun: 20 İş günü (bazı özel cihazlarda 30 iş günü olabilir, örn araçlar vb. Tüketici elektroniğinde 20)
  return '6502 Sayılı Kanun gereği azami tamir süresi 20 iş günüdür.'
}

/**
 * Dashboard/Raporlama için özet
 */
export function generateSlaReport(orders: StoreServiceOrder[], configs: SlaConfig[]): SlaReport {
  const report: SlaReport = { total: orders.length, ok: 0, warning: 0, breached: 0, completed: 0 }
  
  orders.forEach(order => {
    // İlgili kategorinin SLA ayarını bul
    const config = configs.find(c => c.category === order.device_brand) // ya da category
                   || configs[0] // fallback
    
    if (!config) {
      report.ok++
      return
    }

    const status = getSlaStatus(order, config)
    if (status === 'ok' || status === 'paused') report.ok++
    else if (status === 'warning') report.warning++
    else if (status === 'breached') report.breached++
    else if (status === 'completed') report.completed++
  })

  return report
}
