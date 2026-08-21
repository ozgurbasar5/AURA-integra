/**
 * useRealtimeSubscription — Mobile-safe Supabase Realtime subscription hook.
 * Port of web hooks/useRealtimeSubscription.ts without 'use client' pragma.
 * Unmount cleanup is guaranteed.
 */
import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeSubscriptionOptions {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  schema?: string
  onPayload: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void
  supabaseClient?: {
    channel: (name: string) => RealtimeChannel
    removeChannel: (channel: RealtimeChannel) => void
  }
}

export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  schema = 'public',
  onPayload,
  supabaseClient,
}: RealtimeSubscriptionOptions) {
  const payloadHandlerRef = useRef(onPayload)
  payloadHandlerRef.current = onPayload

  useEffect(() => {
    if (!supabaseClient) return

    const channelName = `mobile_rt_${table}_${filter || 'all'}_${Date.now()}`
    const channel = (supabaseClient.channel(channelName) as any)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: any) => {
          payloadHandlerRef.current(payload)
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabaseClient.removeChannel(channel)
      }
    }
  }, [table, event, filter, schema, supabaseClient])
}
