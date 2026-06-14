'use client'

import { useState, useEffect, useCallback } from 'react'
import { onStoreChange } from '@/lib/store'

/** Reaktif localStorage store slice hook */
export function useStoreSlice<T>(
  getter: () => T[],
  setter: (items: T[]) => void,
  module: string
) {
  const [items, setItems] = useState<T[]>([])
  const [mounted, setMounted] = useState(false)

  const refresh = useCallback(() => {
    setItems(getter())
  }, [getter])

  useEffect(() => {
    setMounted(true)
    refresh()
    return onStoreChange((m) => {
      if (!m || m === module) refresh()
    })
  }, [refresh, module])

  const saveAll = useCallback(
    (next: T[]) => {
      setter(next)
      setItems(next)
    },
    [setter]
  )

  return { items, saveAll, refresh, mounted }
}
