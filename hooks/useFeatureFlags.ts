'use client'

import { useEffect, useState } from 'react'
import { fetchTenantFeatureFlags, type TenantFeatureFlags } from '@/lib/feature-flags'

export function useFeatureFlags() {
  const [flags, setFlags] = useState<TenantFeatureFlags | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchTenantFeatureFlags()
      .then(f => { if (!cancelled) setFlags(f) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { flags, loading }
}
