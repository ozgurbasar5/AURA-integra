/**
 * Vardiya bazlı gün sonu (Z) raporu
 */

import {
  getCashSummary,
  getSales,
  getServiceOrders,
  getTransactions,
  getCashShifts,
  getFinanceSummary,
  type CashShift,
} from './store'

export interface ShiftReportLine {
  time: string
  type: 'gelir' | 'gider' | 'stok' | 'servis' | 'pos'
  category: string
  description: string
  amount: number
  payment_method?: string
}

export interface ShiftReport {
  meta: {
    shop_name: string
    branch?: string
    shift_id: string
    opened_at: string
    closed_at: string
    opened_by: string
    closed_by?: string
    generated_at: string
  }
  cash: {
    opening_balance: number
    nakit_giris: number
    nakit_cikis: number
    expected_cash: number
    closing_balance: number
    difference: number
  }
  payments: { nakit: number; kart: number; diger: number; toplam: number }
  operations: { new_orders: number; repaired: number; delivered: number }
  pos: { count: number; revenue: number; profit: number; cost: number }
  service: { delivered_count: number; revenue: number }
  stock: { receipts: number; total_cost: number }
  expenses: { category: string; amount: number }[]
  lines: ShiftReportLine[]
  summary: {
    total_gelir: number
    total_gider: number
    net_cebe: number
    total_maliyet: number
    net_kar: number
  }
}

function inWindow(d: string, from: string, to: string) {
  const t = new Date(d).getTime()
  return t >= new Date(from).getTime() && t <= new Date(to).getTime()
}

export function buildShiftReport(shift: CashShift, shopName = 'Mağaza'): ShiftReport {
  const from = shift.opened_at
  const to = shift.closed_at ?? new Date().toISOString()
  const cash = getCashSummary({ from, to })
  const expected = shift.opening_balance + cash.nakit - cash.nakitCikis
  const closing = shift.closing_balance ?? 0

  const salesInShift = getSales().filter(s => inWindow(s.date, from, to))
  const posRevenue = salesInShift.reduce((s, x) => s + (x.total_with_vat || x.subtotal || 0), 0)
  const posProfit = salesInShift.reduce((s, x) => s + (x.net_profit || 0), 0)
  const posCost = salesInShift.reduce((s, x) => s + (x.cost_price || 0), 0)

  const orders = getServiceOrders()
  const newOrders = orders.filter(o => inWindow(o.created_at, from, to)).length
  const repaired = orders.filter(o =>
    inWindow(o.updated_at, from, to) &&
    ['repair_complete', 'tamamlandi', 'ready_for_pickup', 'teslime_hazir', 'in_repair'].includes(o.status)
  ).length
  const deliveredOrders = orders.filter(o =>
    inWindow(o.updated_at, from, to) &&
    ['delivered', 'teslim_edildi', 'teslim'].includes(o.status)
  )
  const serviceRevenue = deliveredOrders.reduce((s, o) => s + (o.actual_cost || o.estimated_cost || 0), 0)

  const expenseMap = new Map<string, number>()
  const lines: ShiftReportLine[] = []

  for (const t of getTransactions()) {
    if (!inWindow(t.date, from, to)) continue
    if (t.type === 'gider') {
      expenseMap.set(t.category, (expenseMap.get(t.category) ?? 0) + t.amount)
    }
    const isStock = t.description?.includes('Stok alımı')
    lines.push({
      time: t.date,
      type: isStock ? 'stok' : t.type === 'gelir' ? (t.category === 'Satış' ? 'pos' : t.category === 'Servis Teslim' ? 'servis' : 'gelir') : 'gider',
      category: t.category,
      description: t.description,
      amount: t.amount,
      payment_method: t.payment_method,
    })
  }

  for (const s of salesInShift) {
    const itemNames = s.items?.map(i => `${i.name}×${i.qty}`).join(', ') || 'POS'
    lines.push({
      time: s.date,
      type: 'pos',
      category: 'Satış',
      description: `POS — ${itemNames} (${s.customer_name})`,
      amount: s.total_with_vat || s.subtotal || 0,
      payment_method: s.payment_method,
    })
  }

  const stockReceipts = lines.filter(l => l.type === 'stok')
  const stockCost = stockReceipts.reduce((s, l) => s + l.amount, 0)

  const totalGelir = lines.filter(l => ['gelir', 'pos', 'servis'].includes(l.type)).reduce((s, l) => s + l.amount, 0)
  const totalGider = lines.filter(l => l.type === 'gider' || l.type === 'stok').reduce((s, l) => s + l.amount, 0)
  const netKar = posProfit + serviceRevenue - stockCost - lines.filter(l => l.type === 'gider' && !l.description?.includes('Stok')).reduce((s, l) => s + l.amount, 0)

  lines.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  return {
    meta: {
      shop_name: shopName,
      shift_id: shift.id,
      opened_at: from,
      closed_at: to,
      opened_by: shift.opened_by,
      closed_by: shift.closed_by,
      generated_at: new Date().toISOString(),
    },
    cash: {
      opening_balance: shift.opening_balance,
      nakit_giris: cash.nakit,
      nakit_cikis: cash.nakitCikis,
      expected_cash: shift.expected_cash ?? expected,
      closing_balance: closing,
      difference: shift.difference ?? (closing - expected),
    },
    payments: { nakit: cash.nakit, kart: cash.kart, diger: cash.diger, toplam: cash.toplam },
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

/** Vardiya açılışında önerilen kasa tutarı */
export function suggestOpeningCash(): number {
  const shifts = getCashShifts()
  const lastClosed = shifts.find(s => s.status === 'closed' && s.closing_balance != null)
  if (lastClosed?.closing_balance != null) return lastClosed.closing_balance
  return getFinanceSummary().kasaBakiye
}
