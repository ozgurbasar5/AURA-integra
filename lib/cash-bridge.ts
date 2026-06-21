/**
 * Kasa vardiyası — Supabase cash-shifts API ↔ localStorage cache
 */

import {
  getCashShifts,
  getOpenCashShift,
  openCashShift,
  closeCashShift,
  type CashShift,
} from './store'

export async function loadCashShiftsFromApi(): Promise<CashShift[]> {
  try {
    const res = await fetch('/api/tenant/cash-shifts', { credentials: 'same-origin' })
    if (!res.ok) return getCashShifts()
    const json = await res.json() as { items?: Record<string, unknown>[] }
    if (!json.items?.length) return getCashShifts()
    return json.items.map(row => ({
      id: String(row.id),
      status: (row.status as CashShift['status']) ?? 'closed',
      opening_balance: Number(row.opening_balance) || 0,
      closing_balance: row.closing_balance != null ? Number(row.closing_balance) : undefined,
      difference: row.difference != null ? Number(row.difference) : undefined,
      opened_by: String(row.opened_by ?? ''),
      closed_by: row.closed_by ? String(row.closed_by) : undefined,
      opened_at: String(row.opened_at ?? ''),
      closed_at: row.closed_at ? String(row.closed_at) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      branch_id: row.branch_id ? String(row.branch_id) : undefined,
      report_snapshot: row.report_snapshot as CashShift['report_snapshot'],
    }))
  } catch {
    return getCashShifts()
  }
}

export async function openCashShiftViaApi(
  openingBalance: number,
  openedBy: string,
  branchId?: string,
): Promise<CashShift> {
  const res = await fetch('/api/tenant/cash-shifts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'open',
      opening_balance: openingBalance,
      opened_by: openedBy,
    }),
  })
  const json = await res.json() as { error?: string; shift?: Record<string, unknown> }
  if (!res.ok) throw new Error(json.error || 'Vardiya açılamadı')

  const shift = openCashShift(openingBalance, openedBy, branchId)
  if (json.shift?.id) shift.id = String(json.shift.id)
  return shift
}

export async function closeCashShiftViaApi(
  closingBalance: number,
  closedBy: string,
  notes?: string,
): Promise<CashShift | undefined> {
  const res = await fetch('/api/tenant/cash-shifts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'close',
      closing_balance: closingBalance,
      closed_by: closedBy,
      notes,
    }),
  })
  const json = await res.json() as { error?: string; shift?: Record<string, unknown> }
  if (!res.ok) throw new Error(json.error || 'Vardiya kapatılamadı')
  return closeCashShift(closingBalance, closedBy, notes) ?? undefined
}

export { getOpenCashShift }
