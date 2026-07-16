/** e-Fatura entegratör adapter — stub | nes | logo */

import { buildUblTrInvoice } from './ubl-builder'
import { submitViaNes } from './nes-adapter'
import { submitViaLogo } from './logo-adapter'

export type EfaturaInvoicePayload = {
  invoice_no: string
  customer_name: string
  customer_vkn?: string | null
  subtotal: number
  tax_amount: number
  total: number
  invoice_date: string
  description?: string | null
}

export type EfaturaSubmitResult = {
  ok: boolean
  gib_reference?: string
  message: string
  provider: string
  xml?: string
}

export type EfaturaProviderId = 'stub' | 'nes' | 'logo'

export function getEfaturaProviderId(): EfaturaProviderId {
  const p = (process.env.EFATURA_PROVIDER || 'stub').toLowerCase()
  if (p === 'nes') return 'nes'
  if (p === 'logo') return 'logo'
  return 'stub'
}

export function getEfaturaProviderLabel(): string {
  const p = getEfaturaProviderId()
  if (p === 'nes' && process.env.NES_EFATURA_API_KEY) return 'NES (aktif)'
  if (p === 'logo' && process.env.LOGO_EFATURA_URL) return 'Logo (aktif)'
  if (p === 'nes') return 'NES (anahtar eksik)'
  if (p === 'logo') return 'Logo (URL eksik)'
  return "Test modu — GIB'e gönderilmez"
}

/** Sandbox / env hazırlık özeti — UI ve ops için */
export function getEfaturaSandboxStatus(): {
  provider: EfaturaProviderId
  label: string
  configured: boolean
  sandboxReady: boolean
  missing: string[]
} {
  const provider = getEfaturaProviderId()
  const label = getEfaturaProviderLabel()
  const missing: string[] = []

  if (provider === 'nes') {
    if (!process.env.NES_EFATURA_API_KEY?.trim()) missing.push('NES_EFATURA_API_KEY')
  } else if (provider === 'logo') {
    if (!process.env.LOGO_EFATURA_URL?.trim()) missing.push('LOGO_EFATURA_URL')
  }

  const configured = provider !== 'stub' && missing.length === 0
  return {
    provider,
    label,
    configured,
    sandboxReady: configured,
    missing,
  }
}

export async function submitInvoiceToGib(
  invoice: EfaturaInvoicePayload,
): Promise<EfaturaSubmitResult> {
  const xml = buildUblTrInvoice(invoice)
  const provider = getEfaturaProviderId()

  if (provider === 'nes') {
    const result = await submitViaNes(invoice, xml)
    return { ...result, xml: result.xml || xml }
  }

  if (provider === 'logo') {
    const result = await submitViaLogo(invoice, xml)
    return { ...result, xml: result.xml || xml }
  }

  const ref = `GIB-${Date.now()}-${invoice.invoice_no}`
  return {
    ok: true,
    gib_reference: ref,
    message: "Test modu: GIB'e gönderilmedi — UBL üretildi, kuyruğa alındı",
    provider: 'stub',
    xml,
  }
}
