'use client'

/**
 * Supabase Realtime — tenant-scoped store patch + otomatik yeniden bağlanma
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import { tryCreateClient } from '@/lib/supabase/client'
import { partToStock, serviceOrderToStore, txToStore } from '@/lib/db-mappers'
import {
  upsertServiceOrder,
  upsertStockItem,
  removeServiceOrder,
  upsertFinanceTransaction,
  removeFinanceTransactionById,
} from '@/lib/store'

const REALTIME_TABLES = [
  'service_orders',
  'parts',
  'financial_transactions',
] as const

type RealtimeTable = (typeof REALTIME_TABLES)[number]

let channel: RealtimeChannel | null = null
let activeTenantId: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
const MAX_RECONNECT = 6

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function scheduleReconnect(tenantId: string) {
  if (reconnectAttempt >= MAX_RECONNECT) return
  clearReconnectTimer()
  const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt)
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    if (activeTenantId === tenantId) {
      unsubscribeTenantRealtime()
      subscribeTenantRealtime(tenantId)
    }
  }, delay)
}

function handlePayload(
  table: RealtimeTable,
  eventType: string,
  record: Record<string, unknown> | null,
  old: Record<string, unknown> | null,
) {
  try {
    if (eventType === 'DELETE') {
      const id = String(old?.id ?? record?.id ?? '')
      if (!id) return
      if (table === 'service_orders') removeServiceOrder(id)
      else if (table === 'financial_transactions') removeFinanceTransactionById(id)
      return
    }

    if (!record) return

    if (table === 'service_orders') {
      upsertServiceOrder(serviceOrderToStore(record))
    } else if (table === 'parts') {
      upsertStockItem(partToStock(record))
    } else if (table === 'financial_transactions') {
      upsertFinanceTransaction(txToStore(record))
    }
  } catch (err) {
    console.warn('[realtime] payload işlenemedi', table, err)
  }
}

function bindChannel(tenantId: string): RealtimeChannel | null {
  const supabase = tryCreateClient()
  if (!supabase) return null

  const ch = supabase.channel(`tenant:${tenantId}`)

  for (const table of REALTIME_TABLES) {
    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `tenant_id=eq.${tenantId}`,
      },
      payload => {
        handlePayload(
          table,
          payload.eventType,
          payload.new as Record<string, unknown> | null,
          payload.old as Record<string, unknown> | null,
        )
      },
    )
  }

  ch.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempt = 0
      clearReconnectTimer()
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      console.warn('[realtime] kanal durumu:', status, err?.message)
      scheduleReconnect(tenantId)
    }
  })

  return ch
}

/** Tenant Realtime kanalına abone ol */
export function subscribeTenantRealtime(tenantId: string): () => void {
  if (typeof window === 'undefined') return () => {}

  if (channel && activeTenantId === tenantId) {
    return () => unsubscribeTenantRealtime()
  }

  unsubscribeTenantRealtime()
  activeTenantId = tenantId
  channel = bindChannel(tenantId)
  return () => unsubscribeTenantRealtime()
}

export function unsubscribeTenantRealtime(): void {
  clearReconnectTimer()
  reconnectAttempt = 0
  if (channel) {
    const supabase = tryCreateClient()
    if (supabase) void supabase.removeChannel(channel)
    channel = null
  }
  activeTenantId = null
}
