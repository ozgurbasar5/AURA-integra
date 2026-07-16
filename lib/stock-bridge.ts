/**
 * Stok — Supabase parts API ↔ localStorage cache
 */

import { partToStock } from './db-mappers'
import {
  getStock,
  replaceStock,
  upsertStockItem,
  applyRemoteStockReceive,
  type StockItem,
} from './store'

type PartRow = Record<string, unknown>

export async function loadStockFromApi(): Promise<StockItem[]> {
  try {
    const res = await fetch('/api/tenant/parts', { credentials: 'same-origin' })
    if (!res.ok) return getStock()
    const json = (await res.json()) as { items?: PartRow[] }
    if (!json.items) return getStock()
    const items = json.items.map(r => partToStock(r))
    replaceStock(items, { silent: true })
    return items
  } catch {
    return getStock()
  }
}

export async function addStockItemViaApi(
  item: Omit<StockItem, 'id'>,
): Promise<StockItem> {
  const res = await fetch('/api/tenant/parts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  const json = await res.json() as { error?: string; item?: PartRow }
  if (!res.ok) throw new Error(json.error || 'Parça eklenemedi')

  const stockItem = partToStock(json.item ?? {})
  upsertStockItem(stockItem, { silent: true })
  return stockItem
}

export async function updateStockQtyViaApi(
  id: string,
  stockQty: number,
): Promise<StockItem> {
  const res = await fetch('/api/tenant/parts', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, stock_qty: stockQty }),
  })
  const json = await res.json() as { error?: string; item?: PartRow }
  if (!res.ok) throw new Error(json.error || 'Stok güncellenemedi')
  const stockItem = partToStock(json.item ?? {})
  upsertStockItem(stockItem, { silent: true })
  return stockItem
}

export async function updateStockItemViaApi(
  item: Partial<StockItem> & { id: string },
): Promise<StockItem> {
  const res = await fetch('/api/tenant/parts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  const json = await res.json() as { error?: string; item?: PartRow }
  if (!res.ok) throw new Error(json.error || 'Parça güncellenemedi')
  const stockItem = partToStock(json.item ?? {})
  upsertStockItem(stockItem, { silent: true })
  return stockItem
}

export async function deleteStockItemViaApi(id: string): Promise<void> {
  const res = await fetch('/api/tenant/parts', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const json = await res.json() as { error?: string }
  if (!res.ok) throw new Error(json.error || 'Parça silinemedi')
  const next = getStock().filter(s => s.id !== id)
  replaceStock(next, { silent: true })
}

export async function submitStockCountViaApi(
  items: Array<{ part_id: string; counted_qty: number; expected_qty?: number }>,
  notes?: string,
): Promise<StockItem[]> {
  const res = await fetch('/api/tenant/stock/count', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, notes }),
  })
  const json = await res.json() as { error?: string; items?: StockItem[] }
  if (!res.ok) throw new Error(json.error || 'Sayım kaydedilemedi')

  const stockItems = json.items ?? []
  for (const item of stockItems) {
    upsertStockItem(item, { silent: true })
  }
  return stockItems
}

export async function receiveStockViaApi(
  stockId: string,
  qty: number,
  totalCost: number,
  supplier: string,
  itemName: string,
): Promise<void> {
  const res = await fetch('/api/tenant/stock/receive', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_id: stockId,
      qty,
      total_cost: totalCost,
      supplier,
      item_name: itemName,
    }),
  })
  const json = await res.json() as { error?: string; item?: PartRow; kasa_balance?: number }
  if (!res.ok) throw new Error(json.error || 'Stok girişi başarısız')

  const stockItem = json.item
    ? partToStock(json.item)
    : getStock().find(s => s.id === stockId)
  if (stockItem) {
    applyRemoteStockReceive(stockItem, qty, totalCost, json.kasa_balance)
  }
}
