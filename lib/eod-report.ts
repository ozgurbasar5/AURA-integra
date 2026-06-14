/**
 * Vardiya bazlı gün sonu (Z) raporu
 */

import {
  getCashSummary,
  getSales,
  getServiceOrders,
  getTransactions,
  type CashShift,
} from './store'

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
  pos: { count: number; revenue: number; profit: number }
  expenses: { category: string; amount: number }[]
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

  const orders = getServiceOrders()
  const newOrders = orders.filter(o => inWindow(o.created_at, from, to)).length
  const repaired = orders.filter(o =>
    inWindow(o.updated_at, from, to) &&
    ['repair_complete', 'tamamlandi', 'ready_for_pickup', 'teslime_hazir', 'in_repair'].includes(o.status)
  ).length
  const delivered = orders.filter(o =>
    inWindow(o.updated_at, from, to) &&
    ['delivered', 'teslim_edildi', 'teslim'].includes(o.status)
  ).length

  const expenseMap = new Map<string, number>()
  for (const t of getTransactions()) {
    if (t.type !== 'gider' || !inWindow(t.date, from, to)) continue
    expenseMap.set(t.category, (expenseMap.get(t.category) ?? 0) + t.amount)
  }

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
    operations: { new_orders: newOrders, repaired, delivered },
    pos: { count: salesInShift.length, revenue: posRevenue, profit: posProfit },
    expenses: [...expenseMap.entries()].map(([category, amount]) => ({ category, amount })),
  }
}
