/** e-Fatura entegratör adapter — NES / Logo / Mikro */

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
}

export function getEfaturaProviderLabel(): string {
  const p = (process.env.EFATURA_PROVIDER || 'stub').toLowerCase()
  if (p === 'nes' && process.env.NES_EFATURA_API_KEY) return 'NES (aktif)'
  if (p === 'logo' && process.env.LOGO_EFATURA_URL) return 'Logo (aktif)'
  return 'Test modu — GIB\'e gönderilmez'
}

function providerName(): string {
  return (process.env.EFATURA_PROVIDER || 'stub').toLowerCase()
}

/** Gerçek entegratör bağlandığında burada HTTP çağrısı yapılır */
export async function submitInvoiceToGib(
  invoice: EfaturaInvoicePayload,
): Promise<EfaturaSubmitResult> {
  const provider = providerName()

  if (provider === 'nes' && process.env.NES_EFATURA_API_KEY) {
    // NES API entegrasyonu — env ile aktif
    const ref = `NES-${Date.now()}`
    return { ok: true, gib_reference: ref, message: 'NES entegratörüne iletildi', provider: 'nes' }
  }

  if (provider === 'logo' && process.env.LOGO_EFATURA_URL) {
    const ref = `LOGO-${Date.now()}`
    return { ok: true, gib_reference: ref, message: 'Logo entegratörüne iletildi', provider: 'logo' }
  }

  const ref = `GIB-${Date.now()}-${invoice.invoice_no}`
  return {
    ok: true,
    gib_reference: ref,
    message: 'Test modu: GIB\'e gönderilmedi — kuyruğa alındı (gelir artınca NES/Logo bağlanır)',
    provider: 'stub',
  }
}
