/** WhatsApp gönderim sağlayıcıları — wa.me (varsayılan), stub, meta_cloud */

export type WhatsAppSendResult = {
  ok: boolean
  messageId?: string
  waMeUrl?: string
  error?: string
}

export type WhatsAppTestResult = {
  ok: boolean
  message?: string
  error?: string
}

export type WhatsAppProvider = {
  id: 'wa_me' | 'stub' | 'meta_cloud'
  send(opts: { to: string; message: string; tenantId?: string }): Promise<WhatsAppSendResult>
  test(): Promise<WhatsAppTestResult>
}

function normalizePhone(to: string): string {
  return to.replace(/\D/g, '')
}

export function buildWaMeUrl(to: string, message: string): string {
  const phone = normalizePhone(to)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

const waMeProvider: WhatsAppProvider = {
  id: 'wa_me',
  async send({ to, message }) {
    const waMeUrl = buildWaMeUrl(to, message)
    return { ok: true, waMeUrl, messageId: `wame_${Date.now()}` }
  },
  async test() {
    return { ok: true, message: 'wa.me manuel kanal hazır — Cloud API için WHATSAPP_PROVIDER=meta_cloud' }
  },
}

const stubProvider: WhatsAppProvider = {
  id: 'stub',
  async send({ to, message }) {
    const messageId = `wa_stub_${Date.now()}`
    console.info('[whatsapp:stub]', { to: normalizePhone(to), message: message.slice(0, 80), messageId })
    return { ok: true, messageId }
  },
  async test() {
    return { ok: true, message: 'WhatsApp stub aktif — mesajlar loglanır, gönderilmez' }
  },
}

const metaCloudProvider: WhatsAppProvider = {
  id: 'meta_cloud',
  async send({ to, message }) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (!token || !phoneId) {
      return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID eksik' }
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizePhone(to),
          type: 'text',
          text: { body: message },
        }),
      })
      const json = await res.json() as { messages?: { id: string }[]; error?: { message: string } }
      if (!res.ok) {
        return { ok: false, error: json.error?.message || `Meta API ${res.status}` }
      }
      return { ok: true, messageId: json.messages?.[0]?.id }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Meta Cloud gönderim hatası' }
    }
  },
  async test() {
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (!token || !phoneId) {
      return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID eksik' }
    }
    return { ok: true, message: 'Meta Cloud env yapılandırılmış' }
  },
}

/** Env varsa Meta Cloud otomatik; aksi halde WHATSAPP_PROVIDER veya wa.me */
export function getWhatsAppProvider(): WhatsAppProvider {
  const hasMeta =
    Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()) &&
    Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim())
  const explicit = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim()

  if (explicit === 'stub') return stubProvider
  if (explicit === 'wa_me' || explicit === 'wame') return waMeProvider
  if (explicit === 'meta_cloud' || explicit === 'meta' || (!explicit && hasMeta)) {
    return metaCloudProvider
  }
  return waMeProvider
}

export function getWhatsAppProviderLabel(): string {
  const p = getWhatsAppProvider()
  if (p.id === 'meta_cloud') return 'Meta Cloud API'
  if (p.id === 'stub') return 'Stub (log)'
  return 'wa.me (manuel fallback)'
}
