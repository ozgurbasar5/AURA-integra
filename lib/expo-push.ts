import { getServiceClient } from '@/lib/supabase/service'
import { logNotification } from '@/lib/notification-service'

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
}

/** Expo Push API — https://docs.expo.dev/push-notifications/sending-notifications/ */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{ ok: number; fail: number }> {
  if (!messages.length) return { ok: 0, fail: 0 }
  let ok = 0
  let fail = 0
  // Expo accepts up to 100 messages per request
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk.map(m => ({
          to: m.to,
          title: m.title,
          body: m.body,
          data: m.data ?? {},
          sound: m.sound ?? 'default',
        }))),
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) {
        fail += chunk.length
        continue
      }
      const json = await res.json() as { data?: Array<{ status?: string }> }
      for (const ticket of json.data ?? []) {
        if (ticket.status === 'ok') ok += 1
        else fail += 1
      }
    } catch {
      fail += chunk.length
    }
  }
  return { ok, fail }
}

const PUSH_STATUSES: Record<string, { title: string; body: (orderNo: string) => string }> = {
  onay_bekleniyor: {
    title: 'Müşteri onayı bekleniyor',
    body: orderNo => `${orderNo} onay bekliyor`,
  },
  customer_approval_pending: {
    title: 'Müşteri onayı bekleniyor',
    body: orderNo => `${orderNo} onay bekliyor`,
  },
  kalite_kontrol: {
    title: 'Kalite kontrol',
    body: orderNo => `${orderNo} kalite kontrolde`,
  },
  teslime_hazir: {
    title: 'Teslime hazır',
    body: orderNo => `${orderNo} teslime hazır`,
  },
  ready_for_pickup: {
    title: 'Teslime hazır',
    body: orderNo => `${orderNo} teslime hazır`,
  },
}

export function shouldNotifyPush(status: string): boolean {
  return status in PUSH_STATUSES
}

/** Tenant personeline Expo push gönder + notification_logs */
export async function notifyTenantPushOnStatus(opts: {
  tenantId: string
  status: string
  orderNo: string
  customerName?: string
  orderId?: string
}): Promise<void> {
  const tpl = PUSH_STATUSES[opts.status]
  if (!tpl) return

  const svc = getServiceClient()
  if (!svc) return

  const { data: tokens } = await svc
    .from('device_push_tokens')
    .select('token, user_id')
    .eq('tenant_id', opts.tenantId)

  const list = (tokens ?? []).filter(t => t.token)
  if (!list.length) {
    await logNotification(svc, opts.tenantId, {
      channel: 'push',
      recipient: 'tenant',
      content: `[push-skip] ${tpl.title}: ${tpl.body(opts.orderNo)} (token yok)`,
      status: 'skipped',
      order_no: opts.orderNo,
      customer_name: opts.customerName,
    })
    return
  }

  const title = tpl.title
  const body = tpl.body(opts.orderNo)
  const result = await sendExpoPush(
    list.map(t => ({
      to: t.token,
      title,
      body,
      data: { orderId: opts.orderId, orderNo: opts.orderNo, status: opts.status },
    })),
  )

  await logNotification(svc, opts.tenantId, {
    channel: 'push',
    recipient: `${list.length} cihaz`,
    content: `${title}: ${body} (ok=${result.ok}, fail=${result.fail})`,
    status: result.ok > 0 ? 'sent' : 'failed',
    order_no: opts.orderNo,
    customer_name: opts.customerName,
  })
}
