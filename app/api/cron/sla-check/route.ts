export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { getSlaStatus } from '@/lib/sla-engine'
import { slaConfigToStore } from '@/lib/db-mappers'

/**
 * Günlük SLA Check Cron Job
 * 
 * Amaç: 
 * 1. Açık olan tüm iş emirlerini (service_orders) tara
 * 2. SLA'i ihlal edenleri (breached) bul
 * 3. SLA ihlaline yaklaşanları (warning) bul
 * 4. Gerekli bildirimleri (notification_logs veya e-posta) oluştur
 * 
 * Not: Bu endpoint dışarıdan çağrıldığında auth gerektirmemelidir,
 * genellikle Vercel Cron gibi bir servis ile tetiklenir ve yetkilendirme
 * header'lar üzerinden yapılır (Cron Secret).
 */
export async function GET(req: Request) {
  // 1. Cron Secret Doğrulaması (İsteğe bağlı, güvenlik için önerilir)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'DB Bağlantı hatası' }, { status: 500 })

  // 1. Tüm aktif tenantların SLA configlerini çek
  const { data: configData, error: configError } = await supabase
    .from('sla_configs')
    .select('*')
    .eq('is_active', true)
    
  if (configError) return NextResponse.json({ error: configError.message }, { status: 500 })
  const configs = (configData || []).map(slaConfigToStore)

  // 2. Tamamlanmamış olan tüm servis emirlerini çek (status in ('kayit_bekliyor', 'cihaz_alindi', 'islem_goruyor', 'parca_bekliyor', 'onay_bekliyor'))
  const openStatuses = ['kayit_bekliyor', 'cihaz_alindi', 'islem_goruyor', 'parca_bekliyor', 'onay_bekliyor']
  
  const { data: openOrders, error: ordersError } = await supabase
    .from('service_orders')
    .select('id, tenant_id, status, created_at, customer_name, device_brand, device_model, order_no')
    .in('status', openStatuses)

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })

  const notificationsToInsert: any[] = []

  // 3. Her iş emri için SLA hesapla
  for (const order of openOrders || []) {
    // Tenant ve Kategori bazlı config bul (yoksa varsayılan)
    let config = configs.find(c => c.tenant_id === order.tenant_id && c.category === order.device_brand)
    if (!config) {
      config = configs.find(c => c.tenant_id === order.tenant_id && c.category === 'Genel') // Genel fallback
    }

    if (!config) continue // Config yoksa hesaplama yapma

    const status = getSlaStatus(order as any, config)

    if (status === 'breached') {
      // İhlal bildirimi oluştur
      notificationsToInsert.push({
        id: crypto.randomUUID(),
        tenant_id: order.tenant_id,
        user_id: null, // Admin veya menajere gidecek
        title: 'SLA İHLALİ!',
        message: `${order.order_no} numaralı ${order.device_brand} ${order.device_model} cihazın onarım süresi yasal/standart süreyi aşmıştır.`,
        type: 'sla_breached',
        is_read: false,
        created_at: new Date().toISOString()
      })
    } else if (status === 'warning') {
      // Uyarı bildirimi oluştur
      notificationsToInsert.push({
        id: crypto.randomUUID(),
        tenant_id: order.tenant_id,
        user_id: null,
        title: 'SLA UYARISI',
        message: `${order.order_no} numaralı cihazın SLA süresi dolmak üzere.`,
        type: 'sla_warning',
        is_read: false,
        created_at: new Date().toISOString()
      })
    }
  }

  // 4. Bildirimleri kaydet
  if (notificationsToInsert.length > 0) {
    // Toplu insert yaparken hataları ayıklamak için küçük parçalara (batch) bölmek faydalı olabilir
    // Şimdilik doğrudan atıyoruz
    await supabase.from('notification_logs').insert(notificationsToInsert)
  }

  return NextResponse.json({ 
    ok: true, 
    checked_orders: openOrders?.length || 0,
    warnings: notificationsToInsert.filter(n => n.type === 'sla_warning').length,
    breaches: notificationsToInsert.filter(n => n.type === 'sla_breached').length 
  })
}
