/** Logo e-Fatura HTTP adapter — URL yoksa net hata */

import type { EfaturaInvoicePayload, EfaturaSubmitResult } from './provider'
import { buildUblTrInvoice } from './ubl-builder'

export async function submitViaLogo(
  invoice: EfaturaInvoicePayload,
  xml?: string,
): Promise<EfaturaSubmitResult> {
  const baseUrl = process.env.LOGO_EFATURA_URL
  const apiKey = process.env.LOGO_EFATURA_API_KEY

  if (!baseUrl) {
    return {
      ok: false,
      message: 'LOGO_EFATURA_URL yapılandırılmamış',
      provider: 'logo',
    }
  }

  const ubl = xml || buildUblTrInvoice(invoice)

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/efatura`, {
      method: 'POST',
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'Content-Type': 'application/xml',
        Accept: 'application/json',
      },
      body: ubl,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        message: `Logo HTTP ${res.status}: ${text.slice(0, 200)}`,
        provider: 'logo',
        xml: ubl,
      }
    }

    const json = await res.json().catch(() => ({})) as { reference?: string; id?: string }
    return {
      ok: true,
      gib_reference: json.reference || json.id || `LOGO-${Date.now()}`,
      message: 'Logo entegratörüne iletildi',
      provider: 'logo',
      xml: ubl,
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Logo bağlantı hatası',
      provider: 'logo',
      xml: ubl,
    }
  }
}
