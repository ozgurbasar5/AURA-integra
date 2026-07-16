/** Gün sonu (Z) raporu — saf DB satırlarından (store yok) */

import type { ShiftReport, ShiftReportLine } from './eod-report'

const CARI = new Set(['Cari Borç', 'Cari Tahsilat'])

export type DbShiftRow = {
  id: string
  opened_at: string
  closed_at?: string | null
  opened_by?: string | null
  closed_by?: string | null
  opening_balance?: number | null
  closing_balance?: number | null
  expected_cash?: number | null
  difference?: number | null
}

export type DbTxRow = {
  type: string
  amount: number
  category?: string | null
  description?: string | null
  payment_method?: string | null
  transaction_date?: string | null
  created_at?: string | null
}

export type DbSaleRow = {
  total?: number | null
  total_with_vat?: number | null
  subtotal?: number | null
  net_profit?: number | null
  cost_price?: number | null
  created_at?: string | null
}

export type DbOrderRow = {
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  actual_cost?: number | null
  estimated_cost?: number | null
}

function inWindow(d: string | null | undefined, from: string, to: string) {
  if (!d) return false
  const t = new Date(d).getTime()
  return t >= new Date(from).getTime() && t <= new Date(to).getTime()
}

export function buildShiftReportFromDb(opts: {
  shift: DbShiftRow
  shopName: string
  transactions: DbTxRow[]
  sales: DbSaleRow[]
  orders: DbOrderRow[]
}): ShiftReport {
  const { shift, shopName, transactions, sales, orders } = opts
  const from = shift.opened_at
  const to = shift.closed_at ?? new Date().toISOString()
  const opening = Number(shift.opening_balance) || 0
  const closing = Number(shift.closing_balance) || 0

  let nakit = 0
  let nakitCikis = 0
  let kart = 0
  let diger = 0

  const expenseMap = new Map<string, number>()
  const lines: ShiftReportLine[] = []

  for (const t of transactions) {
    const date = String(t.transaction_date ?? t.created_at ?? '')
    if (!inWindow(date, from, to)) continue
    if (CARI.has(String(t.category ?? ''))) continue
    const amt = Number(t.amount) || 0
    const pm = String(t.payment_method || '').toLowerCase()
    if (t.type === 'gelir') {
      if (pm === 'nakit') nakit += amt
      else if (pm.includes('kart') || pm === 'kredi_karti') kart += amt
      else diger += amt
    } else if (t.type === 'gider') {
      if (pm === 'nakit') nakitCikis += amt
      expenseMap.set(String(t.category || 'Diğer'), (expenseMap.get(String(t.category || 'Diğer')) ?? 0) + amt)
    }

    const isStock =
      String(t.description || '').includes('Stok alımı') ||
      t.category === 'Alış' ||
      t.category === 'Tedarikçi'
    lines.push({
      time: date,
      type: isStock
        ? 'stok'
        : t.type === 'gelir'
          ? t.category === 'Satış'
            ? 'pos'
            : t.category === 'Servis Teslim'
              ? 'servis'
              : 'gelir'
          : 'gider',
      category: String(t.category || ''),
      description: String(t.description || ''),
      amount: amt,
      payment_method: t.payment_method ?? undefined,
    })
  }

  const expected = opening + nakit - nakitCikis
  const salesInShift = sales.filter(s => inWindow(String(s.created_at), from, to))
  const posRevenue = salesInShift.reduce((s, x) => s + (Number(x.total_with_vat) || Number(x.total) || Number(x.subtotal) || 0), 0)
  const posProfit = salesInShift.reduce((s, x) => s + (Number(x.net_profit) || 0), 0)
  const posCost = salesInShift.reduce((s, x) => s + (Number(x.cost_price) || 0), 0)

  const newOrders = orders.filter(o => inWindow(String(o.created_at), from, to)).length
  const repaired = orders.filter(o =>
    inWindow(String(o.updated_at), from, to) &&
    ['repair_complete', 'tamamlandi', 'ready_for_pickup', 'teslime_hazir', 'in_repair', 'tamir', 'kalite_kontrol'].includes(String(o.status)),
  ).length
  const deliveredOrders = orders.filter(o =>
    inWindow(String(o.updated_at), from, to) &&
    ['delivered', 'teslim_edildi', 'teslim'].includes(String(o.status)),
  )
  const serviceRevenue = deliveredOrders.reduce(
    (s, o) => s + (Number(o.actual_cost) || Number(o.estimated_cost) || 0),
    0,
  )

  const stockReceipts = lines.filter(l => l.type === 'stok')
  const stockCost = stockReceipts.reduce((s, l) => s + l.amount, 0)
  const totalGelir = lines.filter(l => ['gelir', 'pos', 'servis'].includes(l.type)).reduce((s, l) => s + l.amount, 0)
  const totalGider = lines.filter(l => l.type === 'gider' || l.type === 'stok').reduce((s, l) => s + l.amount, 0)
  const netKar =
    posProfit +
    serviceRevenue -
    stockCost -
    lines.filter(l => l.type === 'gider' && !l.description?.includes('Stok')).reduce((s, l) => s + l.amount, 0)

  lines.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  return {
    meta: {
      shop_name: shopName,
      shift_id: shift.id,
      opened_at: from,
      closed_at: to,
      opened_by: String(shift.opened_by || ''),
      closed_by: shift.closed_by ? String(shift.closed_by) : undefined,
      generated_at: new Date().toISOString(),
    },
    cash: {
      opening_balance: opening,
      nakit_giris: nakit,
      nakit_cikis: nakitCikis,
      expected_cash: shift.expected_cash != null ? Number(shift.expected_cash) : expected,
      closing_balance: closing,
      difference: shift.difference != null ? Number(shift.difference) : closing - expected,
    },
    payments: { nakit, kart, diger, toplam: nakit + kart + diger },
    operations: { new_orders: newOrders, repaired, delivered: deliveredOrders.length },
    pos: { count: salesInShift.length, revenue: posRevenue, profit: posProfit, cost: posCost },
    service: { delivered_count: deliveredOrders.length, revenue: serviceRevenue },
    stock: { receipts: stockReceipts.length, total_cost: stockCost },
    expenses: [...expenseMap.entries()].map(([category, amount]) => ({ category, amount })),
    lines,
    summary: {
      total_gelir: totalGelir,
      total_gider: totalGider,
      net_cebe: totalGelir - totalGider,
      total_maliyet: posCost + stockCost,
      net_kar: netKar,
    },
  }
}
