/** DB financial_transactions.payment_method CHECK ile uyumlu değerler */
const ALLOWED = new Set([
  'nakit',
  'kredi_karti',
  'havale',
  'veresiye',
  'cek',
  'senet',
])

/** İstemci / form değerlerini veritabanı kısıtına normalize et */
export function normalizePaymentMethod(method?: string | null): string {
  const raw = (method ?? 'nakit').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, '_')
  if (raw === 'eft' || raw === 'banka' || raw === 'banka_havalesi' || raw === 'transfer') return 'havale'
  if (raw === 'kart' || raw === 'kredi' || raw === 'pos' || raw === 'kredi_karti') return 'kredi_karti'
  if (ALLOWED.has(raw)) return raw
  return 'nakit'
}
