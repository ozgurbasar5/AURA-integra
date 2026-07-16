/** NES e-Fatura HTTP adapter — anahtar yoksa net hata */

import type { EfaturaInvoicePayload, EfaturaSubmitResult } from './provider'
import { buildUblTrInvoice } from './ubl-builder'

export async function submitViaNes(
  invoice: EfaturaInvoicePayload,
  xml?: string,
): Promise<EfaturaSubmitResult> {
  const apiKey = process.env.NES_EFATURA_API_KEY
  const baseUrl = process.env.NES_EFATURA_URL || 'https://api.nes.com.tr'

  if (!apiKey) {
    return {
      ok: false,
      message: 'NES_EFATURA_API_KEY yapılandırılmamış',
      provider: 'nes',
    }
  }

  const ubl = xml || buildUblTrInvoice(invoice)

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/efatura/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/xml',
        Accept: 'application/json',
      },
      body: ubl,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        message: `NES HTTP ${res.status}: ${text.slice(0, 200)}`,
        provider: 'nes',
        xml: ubl,
      }
    }

    const json = await res.json().catch(() => ({})) as { reference?: string; id?: string }
    return {
      ok: true,
      gib_reference: json.reference || json.id || `NES-${Date.now()}`,
      message: 'NES entegratörüne iletildi',
      provider: 'nes',
      xml: ubl,
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'NES bağlantı hatası',
      provider: 'nes',
      xml: ubl,
    }
  }
}
