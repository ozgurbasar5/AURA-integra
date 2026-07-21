import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, invalidateApiCache } from './api'
import { useAuth } from './auth'

export type TenantMe = {
  ok?: boolean
  user_id?: string
  tenant_id?: string
  role?: string | null
  full_name?: string | null
  shop_name?: string | null
  company_name?: string | null
  phone?: string | null
  city?: string | null
  portal_slug?: string | null
}

type TenantCtx = {
  me: TenantMe | null
  loading: boolean
  error: string | null
  refresh: (fresh?: boolean) => Promise<void>
}

const Ctx = createContext<TenantCtx | null>(null)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { profile, session } = useAuth()
  const [me, setMe] = useState<TenantMe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (fresh = false) => {
    if (!session || !profile?.tenant_id) {
      setMe(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const json = await apiFetch('/api/tenant/me', { fresh }) as TenantMe
      setMe(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tenant bilgisi alınamadı')
    } finally {
      setLoading(false)
    }
  }, [session, profile?.tenant_id])

  useEffect(() => {
    if (session && profile?.tenant_id) void refresh()
    else {
      setMe(null)
      invalidateApiCache('/api/tenant/me')
    }
  }, [session, profile?.tenant_id, refresh])

  const value = useMemo(() => ({ me, loading, error, refresh }), [me, loading, error, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTenant() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
