import { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from './api'

export type UseApiQueryOptions = {
  enabled?: boolean
  refetchOnFocus?: boolean
  cache?: boolean
}

/**
 * Stale-while-revalidate: cache/veri varsa hemen göster,
 * arka planda fresh çek. Skeleton yalnızca data yokken.
 */
export function useApiQuery<T>(
  path: string | null,
  map: (json: unknown) => T,
  opts: UseApiQueryOptions = {},
) {
  const { enabled = true, refetchOnFocus = true } = opts
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const hasData = useRef(false)
  const pathRef = useRef(path)
  const mapRef = useRef(map)
  pathRef.current = path
  mapRef.current = map

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    const p = pathRef.current
    if (!enabled || !p) {
      setLoading(false)
      return
    }

    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    if (!isRefresh) setError(null)

    try {
      const json = await apiFetch(p, fresh ? { fresh: true } : {})
      const mapped = mapRef.current(json)
      setData(mapped)
      hasData.current = true
      setError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Yüklenemedi'
      if (!hasData.current) {
        setError(msg)
        setData(null)
      } else if (isRefresh || fresh) {
        setError(msg)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [enabled])

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !path) return
      const had = hasData.current
      void (async () => {
        if (!had) await load(false)
        else if (refetchOnFocus) await load(true)
        else return
        if (!had && refetchOnFocus) void load(true)
      })()
    }, [enabled, path, refetchOnFocus, load]),
  )

  const refresh = useCallback(() => load(true, true), [load])

  const mutate = useCallback((next: T | ((prev: T | null) => T)) => {
    setData(prev => {
      const v = typeof next === 'function' ? (next as (p: T | null) => T)(prev) : next
      hasData.current = true
      return v
    })
  }, [])

  return { data, error, loading, refreshing, refresh, mutate, reload: load }
}
