/**
 * Servis siparişleri — Supabase API ↔ localStorage store köprüsü
 * UI store formatını (İngilizce status, job_no) kullanır; API/DB Türkçe status + order_no.
 */

import { mapDbStatusToStore, mapStoreStatusToDb } from './erp-features'
import {
  getServiceOrders,
  getServiceOrderById,
  replaceServiceOrders,
  upsertServiceOrder,
  addServiceOrder,
  updateServiceOrder,
  type StoreServiceOrder,
} from './store'

type DbRow = Record<string, unknown>

function dbToStore(row: DbRow): StoreServiceOrder {
  const customers = row.customers as { full_name?: string; phone?: string } | null | undefined
  const technician = row.technician as { full_name?: string } | null | undefined
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
  fault_description?: string
  technician_notes?: string
  technician?: string | null
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

  if (patch.technician !== undefined) {
    updateServiceOrder(id, { technician: patch.technician })
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
