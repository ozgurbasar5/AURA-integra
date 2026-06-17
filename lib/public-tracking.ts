import type { SupabaseClient } from '@supabase/supabase-js'
import { maskPhone } from './pii-crypto'
import {
  filterOrdersByTrackingQuery,
  mapDbOrderToPortalHit,
  trackingQueryMatchesOrder,
  type PortalOrderHit,
} from './tracking-search'

export const PUBLIC_ORDER_SELECT = `
  id, order_no, status, device_brand, device_model, imei,
  estimated_cost, actual_cost, created_at, estimated_delivery, fault_description,
  customer_name, customer_phone,
  customers ( full_name, phone )
`

export function maskPortalOrderHit(hit: PortalOrderHit): PortalOrderHit {
  return {
    ...hit,
    customer_phone: hit.customer_phone ? maskPhone(hit.customer_phone) : '',
  }
}

function needsNormalizedScan(q: string, rows: Record<string, unknown>[]): boolean {
  if (!rows.length) return true
  return rows.every(r => !trackingQueryMatchesOrder(q, String(r.order_no ?? '')))
}

/** Tenant-scoped servis arama — portal ve /takip ortak */
export async function searchTenantOrders(
  admin: SupabaseClient,
  tenantId: string,
  q: string,
  limit = 10,
): Promise<Record<string, unknown>[]> {
  const trimmed = q.trim()
  if (!trimmed) return []

  const safe = trimmed.replace(/[%_\\]/g, '\\$&')
  const pattern = `%${safe}%`
  const merged = new Map<string, Record<string, unknown>>()

  async function addRows(rows: Record<string, unknown>[] | null) {
    for (const row of rows ?? []) merged.set(String(row.id), row)
  }

  const { data: byOrderNo } = await admin
    .from('service_orders')
    .select(PUBLIC_ORDER_SELECT)
    .eq('tenant_id', tenantId)
    .ilike('order_no', pattern)
    .order('created_at', { ascending: false })
    .limit(20)
  await addRows(byOrderNo as Record<string, unknown>[] | null)

  const qDigits = trimmed.replace(/\D/g, '')
  if (merged.size === 0 || qDigits.length >= 4) {
    const { data: byImei } = await admin
      .from('service_orders')
      .select(PUBLIC_ORDER_SELECT)
      .eq('tenant_id', tenantId)
      .ilike('imei', pattern)
      .order('created_at', { ascending: false })
      .limit(20)
    await addRows(byImei as Record<string, unknown>[] | null)
  }

  if (merged.size === 0 && qDigits.length >= 10) {
    const { data: byPhone } = await admin
      .from('service_orders')
      .select(PUBLIC_ORDER_SELECT)
      .eq('tenant_id', tenantId)
      .ilike('customer_phone', `%${qDigits.slice(-10)}%`)
      .order('created_at', { ascending: false })
      .limit(20)
    await addRows(byPhone as Record<string, unknown>[] | null)
  }

  if (merged.size === 0) {
    const { data: byName } = await admin
      .from('service_orders')
      .select(PUBLIC_ORDER_SELECT)
      .eq('tenant_id', tenantId)
      .ilike('customer_name', pattern)
      .order('created_at', { ascending: false })
      .limit(20)
    await addRows(byName as Record<string, unknown>[] | null)
  }

  let rows = [...merged.values()]

  if (rows.length === 0 || needsNormalizedScan(trimmed, rows)) {
    const { data: recent } = await admin
      .from('service_orders')
      .select(PUBLIC_ORDER_SELECT)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)

    const normalizedHits = filterOrdersByTrackingQuery(recent ?? [], trimmed)
    for (const row of normalizedHits) merged.set(String(row.id), row as Record<string, unknown>)
    rows = [...merged.values()]
  }

  return filterOrdersByTrackingQuery(rows, trimmed).slice(0, limit)
}

export async function fetchOrderStatusHistory(
  admin: SupabaseClient,
  orderId: string,
): Promise<{ status: string; note: string | null; created_at: string }[]> {
  const { data, error } = await admin
    .from('service_status_history')
    .select('status, note, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []).map(h => ({
    status: String(h.status),
    note: h.note ?? null,
    created_at: String(h.created_at),
  }))
}

export function toPublicOrderHits(rows: Record<string, unknown>[]): PortalOrderHit[] {
  return rows.map(r => maskPortalOrderHit(mapDbOrderToPortalHit(r)))
}
