import * as Print from 'expo-print'
import { apiFetch } from './api'

/** HTML etiket — expo-print ile yazdırılır */
export function buildLabelHtml(opts: {
  title: string
  subtitle?: string
  barcode?: string
  imei?: string
  orderNo?: string
  shopName?: string
}): string {
  const lines = [
    opts.shopName ? `<div class="shop">${escapeHtml(opts.shopName)}</div>` : '',
    `<div class="title">${escapeHtml(opts.title)}</div>`,
    opts.subtitle ? `<div class="sub">${escapeHtml(opts.subtitle)}</div>` : '',
    opts.orderNo ? `<div class="meta">No: ${escapeHtml(opts.orderNo)}</div>` : '',
    opts.imei ? `<div class="meta">IMEI: ${escapeHtml(opts.imei)}</div>` : '',
    opts.barcode ? `<div class="meta">Barkod: ${escapeHtml(opts.barcode)}</div>` : '',
  ].filter(Boolean).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: system-ui, sans-serif; margin: 8px; width: 280px; }
  .shop { font-size: 10px; color: #666; margin-bottom: 4px; }
  .title { font-size: 16px; font-weight: 800; }
  .sub { font-size: 12px; margin-top: 2px; }
  .meta { font-size: 11px; margin-top: 4px; font-family: monospace; }
</style></head><body>${lines}</body></html>`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function printLabel(opts: {
  title: string
  subtitle?: string
  barcode?: string
  imei?: string
  orderNo?: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    let shopName = ''
    try {
      const me = await apiFetch('/api/tenant/me').catch(() => null) as { shop_name?: string; company_name?: string } | null
      shopName = me?.shop_name || me?.company_name || ''
    } catch { /* optional */ }
    await Print.printAsync({ html: buildLabelHtml({ ...opts, shopName }) })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Yazdırılamadı' }
  }
}
