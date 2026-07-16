/**
 * Servis siparişleri — Supabase API ↔ localStorage store köprüsü
 * UI store formatını (İngilizce status, job_no) kullanır; API/DB Türkçe status + order_no.
 */

import { parseDeviceImages } from './device-images'
import { mapDbStatusToStore, mapStoreStatusToDb } from './erp-features'
import {
  getServiceOrders,
  getServiceOrderById,
  replaceServiceOrders,
  upsertServiceOrder,
  addServiceOrder,
  updateServiceOrder,
  applyRemotePartsUse,
  applyRemoteServiceDelivery,
  type StoreServiceOrder,
  type UsedPart,
  type ServiceDelivery,
  type StockItem,
} from './store'

type DbRow = Record<string, unknown>

function dbToStore(row: DbRow): StoreServiceOrder {
  const customers = row.customers as { full_name?: string; phone?: string } | null | undefined
  const technician = row.technician as { full_name?: string } | null | undefined
  const meta = (row.metadata as Record<string, unknown>) ?? {}
  const rawParts = Array.isArray(meta.used_parts) ? meta.used_parts : []
  const used_parts = rawParts.map((p) => {
    const part = p as Record<string, unknown>
    return {
      id: String(part.id ?? part.stock_id ?? ''),
      name: String(part.name ?? ''),
      qty: Number(part.qty) || 0,
      unit_buy: Number(part.unit_buy) || 0,
      unit_sell: Number(part.unit_sell) || 0,
    }
  }).filter(p => p.id)
  const final_checks = Array.isArray(meta.final_checks)
    ? meta.final_checks.map(String)
    : undefined
  return {
    id: String(row.id),
    job_no: String(row.order_no ?? row.job_no ?? ''),
    customer_name: String(row.customer_name ?? customers?.full_name ?? '—'),
    customer_phone: String(row.customer_phone ?? customers?.phone ?? ''),
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    imei: String(row.imei ?? ''),
    status: mapDbStatusToStore(String(row.status ?? 'alindi')),
    technician: technician?.full_name ?? null,
    estimated_cost: Number(row.estimated_cost) || 0,
    actual_cost: row.actual_cost != null ? Number(row.actual_cost) : undefined,
    description: row.fault_description ? String(row.fault_description) : undefined,
    notes: row.technician_notes ? String(row.technician_notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    eta: row.estimated_delivery ? String(row.estimated_delivery) : null,
    images: parseDeviceImages(row),
    used_parts: used_parts.length ? used_parts : undefined,
    private_note: row.private_note != null ? String(row.private_note) : (meta.private_note != null ? String(meta.private_note) : undefined),
    final_checks,
    financial_posted: meta.financial_posted === true,
    delivered_at: meta.delivered_at ? String(meta.delivered_at) : (row.closed_at ? String(row.closed_at) : undefined),
    net_profit: meta.net_profit != null ? Number(meta.net_profit) : undefined,
  }
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: 'same-origin', ...init })
  return res
}

/** API'den çek, store'a yaz, döndür */
export async function loadServiceOrdersFromApi(limit = 100): Promise<StoreServiceOrder[]> {
  try {
    const res = await apiFetch(`/api/service-orders?limit=${limit}`)
    if (!res.ok) return getServiceOrders()
    const json = (await res.json()) as { data?: DbRow[] }
    if (!json.data?.length) return getServiceOrders()
    const orders = json.data.map(dbToStore)
    replaceServiceOrders(orders, { silent: true })
    return orders
  } catch {
    return getServiceOrders()
  }
}

export async function fetchServiceOrderById(id: string): Promise<StoreServiceOrder | undefined> {
  const local = getServiceOrderById(id)
  try {
    const res = await apiFetch(`/api/service-orders/${id}`)
    if (res.ok) {
      const json = (await res.json()) as { data?: DbRow }
      if (json.data) {
        const order = dbToStore(json.data)
        upsertServiceOrder(order)
        return order
      }
    }
  } catch {
    /* offline */
  }
  return local
}

export interface CreateServiceOrderInput {
  customer_name: string
  customer_phone: string
  device_brand: string
  device_model: string
  imei?: string
  description?: string
  estimated_cost?: number
  status?: string
}

export async function createServiceOrderRemote(
  input: CreateServiceOrderInput,
  options?: { allowLocalFallback?: boolean; maxRetries?: number },
): Promise<{ order: StoreServiceOrder | null; synced: boolean; error?: string }> {
  const maxRetries = options?.maxRetries ?? 2
  const allowLocalFallback = options?.allowLocalFallback ?? false
  let lastError = 'Supabase bağlantısı kurulamadı'

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await apiFetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          device_brand: input.device_brand,
          device_model: input.device_model,
          imei: input.imei,
          fault_description: input.description?.trim() || 'Arıza bildirimi',
          estimated_cost: input.estimated_cost ?? 0,
          status: input.status ?? 'waiting_diagnosis',
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { data?: DbRow; error?: string }
      if (res.ok && json.data) {
        const order = dbToStore(json.data)
        upsertServiceOrder(order)
        return { order, synced: true }
      }
      lastError = json.error || `Sunucu hatası (${res.status})`
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Ağ hatası'
    }
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
    }
  }

  if (!allowLocalFallback) {
    return {
      order: null,
      synced: false,
      error: `${lastError}. Kayıt oluşturulamadı — Supabase bağlantısını kontrol edin.`,
    }
  }

  const jobNo = `SRV-${Date.now().toString().slice(-6)}`
  const order = addServiceOrder({
    job_no: jobNo,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    device_brand: input.device_brand,
    device_model: input.device_model,
    imei: input.imei || '-',
    status: input.status ?? 'waiting_diagnosis',
    technician: null,
    estimated_cost: input.estimated_cost ?? 0,
    description: input.description,
    created_at: new Date().toISOString(),
    eta: null,
  })
  return {
    order,
    synced: false,
    error: 'Kayıt yalnızca yerelde oluşturuldu — müşteri portalında görünmez.',
  }
}

export interface UpdateServiceOrderPatch {
  status?: string
  actual_cost?: number
  estimated_cost?: number
  notes?: string
  private_note?: string
  final_checks?: string[]
  fault_description?: string
  technician_notes?: string
  technician?: string | null
  technician_id?: string | null
  images?: string[]
  used_parts?: unknown[]
  approval_status?: string
  delivered_at?: string | null
}

export async function updateServiceOrderRemote(
  id: string,
  patch: UpdateServiceOrderPatch
): Promise<StoreServiceOrder | undefined> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.status != null) dbPatch.status = mapStoreStatusToDb(patch.status)
  if (patch.actual_cost != null) dbPatch.actual_cost = patch.actual_cost
  if (patch.estimated_cost != null) dbPatch.estimated_cost = patch.estimated_cost
  if (patch.notes != null) dbPatch.technician_notes = patch.notes
  if (patch.technician_notes != null) dbPatch.technician_notes = patch.technician_notes
  if (patch.fault_description != null) dbPatch.fault_description = patch.fault_description
  if (patch.images != null) dbPatch.device_images = patch.images
  if (patch.used_parts != null) dbPatch.used_parts = patch.used_parts
  if (patch.private_note !== undefined) dbPatch.private_note = patch.private_note
  if (patch.final_checks != null) dbPatch.final_checks = patch.final_checks
  if (patch.approval_status != null) dbPatch.approval_status = patch.approval_status
  if (patch.delivered_at !== undefined) dbPatch.delivered_at = patch.delivered_at

  if (patch.technician !== undefined) {
    updateServiceOrder(id, { technician: patch.technician })
    dbPatch.technician_name = patch.technician
  }
  if (patch.technician_id !== undefined) {
    dbPatch.technician_id = patch.technician_id
  }

  try {
    const res = await apiFetch(`/api/service-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbPatch),
    })
    if (res.ok) {
      const json = (await res.json()) as { data?: DbRow }
      if (json.data) {
        const order = dbToStore(json.data)
        if (patch.technician !== undefined && !order.technician) {
          order.technician = patch.technician
        }
        upsertServiceOrder(order)
        return order
      }
    }
  } catch {
    /* offline */
  }
  return getServiceOrderById(id)
}

export async function usePartsForServiceViaApi(
  orderId: string,
  parts: UsedPart[],
): Promise<{ ok: true; used_parts: unknown[] } | { ok: false; error: string }> {
  try {
    const res = await apiFetch(`/api/service-orders/${orderId}/use-parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parts }),
    })
    const json = await res.json() as {
      error?: string
      stock_items?: Array<Record<string, unknown>>
      used_parts?: unknown[]
    }
    if (!res.ok) return { ok: false, error: json.error || 'Parça düşülemedi' }

    const stockItems = (json.stock_items ?? []) as unknown as StockItem[]
    applyRemotePartsUse(stockItems, json.used_parts, orderId)
    return { ok: true, used_parts: json.used_parts ?? [] }
  } catch {
    return { ok: false, error: 'Bağlantı hatası — parça düşülemedi' }
  }
}

export async function deliverServiceViaApi(
  orderId: string,
  input: {
    service_fee: number
    payment_method?: string
    used_parts?: UsedPart[]
    warranty_months?: number
    final_checks?: string[]
    job_no: string
    customer_name: string
  },
): Promise<{ ok: true; delivery: ServiceDelivery } | { ok: false; error: string }> {
  try {
    const res = await apiFetch(`/api/service-orders/${orderId}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_fee: input.service_fee,
        payment_method: input.payment_method ?? 'nakit',
        used_parts: input.used_parts?.map(p => ({
          stock_id: p.stock_id,
          name: p.name,
          qty: p.qty,
          unit_buy: p.unit_buy,
          unit_sell: p.unit_sell,
        })),
        warranty_months: input.warranty_months,
        final_checks: input.final_checks,
      }),
    })
    const json = await res.json() as {
      error?: string
      finance_tx_id?: string
      service_fee?: number
      total_expense?: number
      net_profit?: number
      profit_margin?: number
      kasa_balance?: number
      delivered_at?: string
      stock_items?: Array<Record<string, unknown>>
    }
    if (!res.ok) return { ok: false, error: json.error || 'Teslim kaydedilemedi' }

    const delivery: ServiceDelivery = {
      service_id: orderId,
      service_fee: Number(json.service_fee) || input.service_fee,
      total_expense: Number(json.total_expense) || 0,
      net_profit: Number(json.net_profit) || 0,
      profit_margin: Number(json.profit_margin) || 0,
      delivered_at: json.delivered_at || new Date().toISOString(),
      financial_posted: true,
      finance_tx_id: json.finance_tx_id,
    }

    applyRemoteServiceDelivery(orderId, delivery, {
      job_no: input.job_no,
      customer_name: input.customer_name,
      payment_method: input.payment_method ?? 'nakit',
      kasa_balance: json.kasa_balance,
      stock_items: (json.stock_items ?? []) as unknown as StockItem[],
    })

    return { ok: true, delivery }
  } catch {
    return { ok: false, error: 'Bağlantı hatası — teslim kaydedilemedi' }
  }
}
