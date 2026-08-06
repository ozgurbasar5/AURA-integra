import { type ImeiEvent } from './store'
import { getServiceClient } from '@/lib/supabase/service'
import { imeiEventToStore } from '@/lib/db-mappers'

export interface TimelineEntry {
  date: string
  title: string
  description: string
  type: ImeiEvent['event_type']
  customer?: string
}

/**
 * Yeni bir IMEI olayı (event) kaydeder.
 */
export async function recordImeiEvent(
  tenantId: string,
  imei: string,
  event: Partial<ImeiEvent>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getServiceClient()
    if (!supabase) throw new Error('DB Client alınamadı')

    if (!imei || imei.trim().length < 5) {
      throw new Error('Geçersiz IMEI')
    }

    const newRecord = {
      tenant_id: tenantId,
      imei: imei.trim(),
      event_type: event.event_type || 'service',
      event_id: event.event_id || null,
      customer_name: event.customer_name || null,
      notes: event.notes || null,
      metadata: event.metadata || null,
    }

    const { error } = await supabase.from('imei_history').insert([newRecord])
    if (error) throw error
    
    return { ok: true }
  } catch (e: any) {
    console.error('IMEI kayıt hatası:', e)
    return { ok: false, error: e.message }
  }
}

/**
 * Belirli bir IMEI'nin geçmişini getirir.
 */
export async function getImeiHistory(tenantId: string, imei: string): Promise<ImeiEvent[]> {
  try {
    const supabase = getServiceClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('imei_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('imei', imei)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(imeiEventToStore)
  } catch {
    return []
  }
}

/**
 * IMEI geçmişine bakarak risk skorunu hesaplar.
 */
export function getImeiRiskScore(history: ImeiEvent[]): { score: number; flags: string[]; label: 'Güvenli' | 'Riskli' | 'Yüksek Risk' | 'Yeni' } {
  if (!history || history.length === 0) {
    return { score: 0, flags: ['Sistemde ilk kez görülüyor'], label: 'Yeni' }
  }

  let score = 0
  const flags: string[] = []

  // Çalıntı kontrolü (E-Devlet sorgusu vs loglanmışsa)
  const stolenChecks = history.filter(h => h.event_type === 'stolen_check')
  if (stolenChecks.some(h => h.metadata?.result === 'stolen')) {
    score += 100
    flags.push('Çalıntı ihbarı kaydı var!')
  }

  // Çok sık servise gelmesi durumu (kronik arıza riski)
  const serviceEvents = history.filter(h => h.event_type === 'service')
  if (serviceEvents.length >= 3) {
    score += 40
    flags.push('Kronik arızalı olabilir (3+ servis kaydı)')
  }

  // Garanti ihlali durumu
  const warrantyEvents = history.filter(h => h.event_type === 'warranty')
  if (warrantyEvents.some(h => h.metadata?.status === 'ihlal')) {
    score += 30
    flags.push('Garanti ihlali geçmişi var')
  }

  // Başka müşteri üzerine daha önce kaydedilmiş olması
  const customers = new Set(history.map(h => h.customer_name).filter(Boolean))
  if (customers.size > 1) {
    score += 20
    flags.push('Cihaz el değiştirmiş olabilir (Farklı müşteri kayıtları)')
  }

  let label: 'Güvenli' | 'Riskli' | 'Yüksek Risk' | 'Yeni' = 'Güvenli'
  if (score >= 60) label = 'Yüksek Risk'
  else if (score >= 30) label = 'Riskli'

  if (score === 0 && flags.length === 0) {
    flags.push('Geçmişi temiz')
  }

  return { score, flags, label }
}

/**
 * UI için zaman çizelgesi verisini oluşturur.
 */
export function buildImeiTimeline(history: ImeiEvent[]): TimelineEntry[] {
  return history.map(h => {
    let title = 'İşlem'
    let desc = h.notes || ''

    switch (h.event_type) {
      case 'service':
        title = 'Servis Kaydı'
        break
      case 'warranty':
        title = 'Garanti İşlemi'
        break
      case 'sale':
        title = 'Satış / Fatura'
        break
      case 'stolen_check':
        title = 'Çalıntı Sorgulaması'
        break
      case 'purchase':
        title = 'Cihaz Alımı (2. El)'
        break
    }

    return {
      date: new Date(h.created_at).toLocaleDateString('tr-TR'),
      title,
      description: desc,
      type: h.event_type,
      customer: h.customer_name,
    }
  })
}
