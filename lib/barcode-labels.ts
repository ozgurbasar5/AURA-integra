/** Barkod / QR etiket yardımcıları */

export interface LabelLine {
  title: string
  subtitle?: string
  barcode: string
  qrValue?: string
  lines?: string[]
  price?: string
}

export function generateStockBarcode(prefix = 'AURA'): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${ts}-${rnd}`
}

export function stockScanUrl(barcode: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/dashboard/satis?scan=${encodeURIComponent(barcode)}`
}

export function vitrinScanUrl(barcode: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/dashboard/vitrin?code=${encodeURIComponent(barcode)}`
}

export function stockLabelFromItem(item: {
  name: string
  barcode: string
  sell_price: number
  category?: string
}): LabelLine {
  return {
    title: item.name,
    subtitle: item.category,
    barcode: item.barcode,
    qrValue: stockScanUrl(item.barcode),
    lines: [item.category ? `Kategori: ${item.category}` : ''].filter(Boolean),
    price: `${item.sell_price.toLocaleString('tr-TR')} ₺`,
  }
}

export function vitrinLabelFromDevice(d: {
  brand: string
  model: string
  barcode: string
  sell_price: number
  cosmetic_score: number
  battery_health?: number
  color?: string
  storage?: string
}): LabelLine {
  const lines = [
    `Kozmetik: ${d.cosmetic_score}/10`,
    d.battery_health != null ? `Pil: %${d.battery_health}` : '',
    d.color ? `Renk: ${d.color}` : '',
    d.storage ? `Hafıza: ${d.storage}` : '',
  ].filter(Boolean)
  return {
    title: `${d.brand} ${d.model}`,
    subtitle: 'Vitrin Cihazı',
    barcode: d.barcode,
    qrValue: vitrinScanUrl(d.barcode),
    lines,
    price: `${d.sell_price.toLocaleString('tr-TR')} ₺`,
  }
}

export function cosmeticLabel(score: number): string {
  if (score >= 9) return 'Sıfır gibi'
  if (score >= 7) return 'İyi'
  if (score >= 5) return 'Orta'
  return 'Yıpranmış'
}
