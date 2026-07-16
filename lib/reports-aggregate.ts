/** Saf rapor toplama — API ve istemci ortak kullanır */

export const REPORT_CARI_CATEGORIES = new Set(['Cari Borç', 'Cari Tahsilat'])

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const CAT_COLORS = ['#0284c7', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#64748b']

export type ReportTx = {
  type: string
  amount: number
  category?: string | null
  date: string
}

export type MonthlyPoint = { month: string; gelir: number; gider: number; key: string }
export type CategoryPoint = { name: string; value: number; color: string }
export type VatRow = { source: string; net: number; vat: number; gross: number }

export function isReportCari(category?: string | null): boolean {
  return REPORT_CARI_CATEGORIES.has(category ?? '')
}

export function aggregateMonthly(txs: ReportTx[], lastN = 12): MonthlyPoint[] {
  const months: Record<string, { gelir: number; gider: number }> = {}
  for (const tx of txs) {
    if (isReportCari(tx.category)) continue
    const d = new Date(tx.date)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!months[key]) months[key] = { gelir: 0, gider: 0 }
    if (tx.type === 'gelir') months[key].gelir += Number(tx.amount) || 0
    else if (tx.type === 'gider') months[key].gider += Number(tx.amount) || 0
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-lastN)
    .map(([key, val]) => {
      const [, m] = key.split('-')
      return { month: MONTH_NAMES[parseInt(m, 10)] ?? m, key, ...val }
    })
}

export function aggregateCategories(txs: ReportTx[], topN = 6): CategoryPoint[] {
  const cats: Record<string, number> = {}
  for (const t of txs) {
    if (t.type !== 'gelir' || isReportCari(t.category)) continue
    const name = (t.category || 'Diğer').trim() || 'Diğer'
    cats[name] = (cats[name] || 0) + (Number(t.amount) || 0)
  }
  return Object.entries(cats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([name, value], i) => ({ name, value, color: CAT_COLORS[i] || '#94a3b8' }))
}

export function summarizeFinance(txs: ReportTx[]) {
  let totalGelir = 0
  let totalGider = 0
  for (const t of txs) {
    if (isReportCari(t.category)) continue
    if (t.type === 'gelir') totalGelir += Number(t.amount) || 0
    else if (t.type === 'gider') totalGider += Number(t.amount) || 0
  }
  return {
    totalGelir,
    totalGider,
    netKar: totalGelir - totalGider,
    txCount: txs.filter(t => !isReportCari(t.category)).length,
  }
}

export function buildVatFromApi(
  txs: ReportTx[],
  sales: Array<{ subtotal?: number; vat_amount?: number; total_with_vat?: number; total?: number }>,
): { rows: VatRow[]; totalVat: number; totalNet: number; totalGross: number } {
  const rows: VatRow[] = []
  let totalVat = 0
  let totalNet = 0
  let totalGross = 0

  const salesVat = sales.reduce((s, x) => s + (Number(x.vat_amount) || 0), 0)
  const salesNet = sales.reduce((s, x) => s + (Number(x.subtotal) || 0), 0)
  const salesGross = sales.reduce(
    (s, x) => s + (Number(x.total_with_vat) || Number(x.total) || Number(x.subtotal) || 0),
    0,
  )
  if (sales.length) {
    rows.push({ source: 'POS Satışları', net: salesNet, vat: salesVat, gross: salesGross || salesNet + salesVat })
    totalVat += salesVat
    totalNet += salesNet
    totalGross += salesGross || salesNet + salesVat
  }

  const serviceIncome = txs
    .filter(t => t.type === 'gelir' && t.category === 'Servis Teslim')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  if (serviceIncome > 0) {
    const net = Math.round((serviceIncome / 1.2) * 100) / 100
    const vat = Math.round((serviceIncome - net) * 100) / 100
    rows.push({ source: 'Servis Gelirleri (KDV %20)', net, vat, gross: serviceIncome })
    totalVat += vat
    totalNet += net
    totalGross += serviceIncome
  }

  return { rows, totalVat, totalNet, totalGross }
}

export { MONTH_NAMES }
