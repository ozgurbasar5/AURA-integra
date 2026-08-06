'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type InfiniteListState<T> = {
  items: T[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => void
  reset: () => void
}

type FetchPageResult<T> = {
  items: T[]
  hasMore: boolean
}

/**
 * Server-side pagination + infinite scroll hook
 */
export function useInfiniteList<T>(
  fetchPage: (offset: number, limit: number) => Promise<FetchPageResult<T>>,
  options?: { pageSize?: number; deps?: unknown[] },
): InfiniteListState<T> {
  const pageSize = options?.pageSize ?? 50
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    offsetRef.current = 0
    try {
      const { items: page, hasMore: more } = await fetchPage(0, pageSize)
      setItems(page)
      setHasMore(more)
      offsetRef.current = page.length
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }, [fetchPage, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    setLoadingMore(true)
    try {
      const { items: page, hasMore: more } = await fetchPage(offsetRef.current, pageSize)
      setItems(prev => [...prev, ...page])
      setHasMore(more)
      offsetRef.current += page.length
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme hatası')
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loading, loadingMore, pageSize])

  const reset = useCallback(() => {
    void loadInitial()
  }, [loadInitial])

  useEffect(() => {
    void loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps from caller
  }, [loadInitial, ...(options?.deps ?? [])])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, items.length])

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reset,
    sentinelRef,
  } as InfiniteListState<T> & { sentinelRef: React.RefObject<HTMLDivElement | null> }
}
