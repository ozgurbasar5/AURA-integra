/**
 * Alış — /api/tenant/purchases ↔ localStorage cache
 */

import {
  getPurchases,
  setPurchases,
  applyRemotePurchase,
  applyRemotePurchaseDelete,
  type Purchase,
  type StockItem,
} from './store'

export async function loadPurchasesFromApi(): Promise<Purchase[]> {
  try {
    const res = await fetch('/api/tenant/purchases', { credentials: 'same-origin' })
    if (!res.ok) return getPurchases()
    const json = (await res.json()) as { items?: Purchase[] }
    if (!json.items) return getPurchases()
    setPurchases(json.items)
    return json.items
  } catch {
    return getPurchases()
  }
}

export async function updatePurchaseViaApi(
  purchase: Purchase,
): Promise<Purchase> {
  const res = await fetch('/api/tenant/purchases', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchase),
  })
  const json = await res.json() as {
    error?: string
    purchase?: Purchase
    stock_item?: StockItem | null
    kasa_balance?: number
  }
  if (!res.ok || !json.purchase) throw new Error(json.error || 'Alış güncellenemedi')
  // Stok/kasa senkronu için apply; purchase listesi de güncellenir
  applyRemotePurchase(json.purchase, json.stock_item, json.kasa_balance)
  return json.purchase
}

export async function deletePurchaseViaApi(id: string): Promise<void> {
  const res = await fetch('/api/tenant/purchases', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const json = await res.json() as { error?: string; stock_item?: StockItem | null; kasa_balance?: number }
  if (!res.ok) throw new Error(json.error || 'Alış silinemedi')
  applyRemotePurchaseDelete(id, json.stock_item, json.kasa_balance)
}

export async function recordPurchaseViaApi(
  input: Omit<Purchase, 'id' | 'created_at' | 'total_cost'>,
): Promise<Purchase> {
  const res = await fetch('/api/tenant/purchases', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = await res.json() as {
    error?: string
    purchase?: Purchase
    stock_item?: StockItem
    kasa_balance?: number
  }
  if (!res.ok || !json.purchase) {
    throw new Error(json.error || 'Alış kaydedilemedi')
  }

  applyRemotePurchase(json.purchase, json.stock_item, json.kasa_balance)
  return json.purchase
}
