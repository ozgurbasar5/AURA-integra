import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { apiFetch, invalidateApiCache } from './api'
import { useAuth } from './auth'

export type CatalogPart = {
  id: string
  name: string
  barcode: string | null
  stock_qty: number
  min_stock?: number
  sale_price?: number
  sell_price?: number
  buy_price?: number
  category?: string | null
  brand?: string | null
}

const TTL_MS = 90_000

type PartsCtx = {
  parts: CatalogPart[]
  loading: boolean
  error: string | null
  refreshing: boolean
  lastFetchedAt: number | null
  ensureLoaded: (fresh?: boolean) => Promise<CatalogPart[]>
  refresh: () => Promise<CatalogPart[]>
  invalidate: () => void
  findByBarcode: (code: string) => CatalogPart | undefined
  filter: (q: string, opts?: { inStockOnly?: boolean; limit?: number }) => CatalogPart[]
}

const Ctx = createContext<PartsCtx | null>(null)

export function PartsCatalogProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [parts, setParts] = useState<CatalogPart[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  const partsRef = useRef(parts)
  const lastRef = useRef(lastFetchedAt)
  const inflight = useRef<Promise<CatalogPart[]> | null>(null)
  partsRef.current = parts
  lastRef.current = lastFetchedAt

  const fetchParts = useCallback(async (fresh: boolean): Promise<CatalogPart[]> => {
    if (!profile?.tenant_id) {
      setParts([])
      return []
    }
    if (inflight.current) return inflight.current

    const cached = partsRef.current
    const at = lastRef.current
    if (!fresh && at && Date.now() - at < TTL_MS && cached.length > 0) {
      return cached
    }

    const run = (async () => {
      if (cached.length === 0) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const json = await apiFetch('/api/tenant/parts', { fresh: true }) as { items?: CatalogPart[] }
        const items = json.items ?? []
        setParts(items)
        setLastFetchedAt(Date.now())
        return items
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Stok yüklenemedi')
        return partsRef.current
      } finally {
        setLoading(false)
        setRefreshing(false)
        inflight.current = null
      }
    })()

    inflight.current = run
    return run
  }, [profile?.tenant_id])

  const ensureLoaded = useCallback((fresh = false) => fetchParts(fresh), [fetchParts])
  const refresh = useCallback(() => fetchParts(true), [fetchParts])

  const invalidate = useCallback(() => {
    setLastFetchedAt(null)
    lastRef.current = null
    invalidateApiCache('/api/tenant/parts')
  }, [])

  const findByBarcode = useCallback((code: string) => {
    const c = code.trim()
    return partsRef.current.find(p => (p.barcode || '').trim() === c)
  }, [])

  const filter = useCallback((q: string, opts?: { inStockOnly?: boolean; limit?: number }) => {
    const s = q.trim().toLowerCase()
    let list = partsRef.current
    // Use state parts for reactivity in filter results
    list = parts
    if (opts?.inStockOnly) list = list.filter(p => p.stock_qty > 0)
    if (s) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.barcode || '').toLowerCase().includes(s) ||
        (p.brand || '').toLowerCase().includes(s),
      )
    }
    return list.slice(0, opts?.limit ?? 80)
  }, [parts])

  const value = useMemo(() => ({
    parts,
    loading,
    error,
    refreshing,
    lastFetchedAt,
    ensureLoaded,
    refresh,
    invalidate,
    findByBarcode,
    filter,
  }), [
    parts, loading, error, refreshing, lastFetchedAt,
    ensureLoaded, refresh, invalidate, findByBarcode, filter,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePartsCatalog() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePartsCatalog must be used within PartsCatalogProvider')
  return ctx
}
