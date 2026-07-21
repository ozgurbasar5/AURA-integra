import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { invalidateApiCache } from './api'
import { clearMfaVerifiedUserId, getMfaVerifiedUserId, setMfaVerifiedUserId } from './mfa-store'
import { isSupabaseConfigured, supabase } from './supabase'

type Profile = {
  tenant_id: string
  role: string
  full_name: string | null
  is_active: boolean
}

type AuthState = {
  loading: boolean
  profileLoading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  configured: boolean
  mfaPending: boolean
  setMfaPending: (v: boolean) => void
  markMfaVerified: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mfaPending, setMfaPendingState] = useState(false)
  const mfaVerifiedLocally = useRef(false)

  const syncMfaPending = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setMfaPendingState(false)
      return
    }
    if (mfaVerifiedLocally.current) {
      setMfaPendingState(false)
      return
    }
    const verified = await getMfaVerifiedUserId()
    setMfaPendingState(verified !== userId)
  }, [])

  const setMfaPending = useCallback((v: boolean) => {
    if (v) mfaVerifiedLocally.current = false
    setMfaPendingState(v)
  }, [])

  const markMfaVerified = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await setMfaVerifiedUserId(user.id)
    mfaVerifiedLocally.current = true
    setMfaPendingState(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('tenant_id, role, full_name, is_active')
        .eq('id', user.id)
        .maybeSingle()
      setProfile((data as Profile | null) ?? null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      void syncMfaPending(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event !== 'TOKEN_REFRESHED') {
        void syncMfaPending(next?.user?.id)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [syncMfaPending])

  useEffect(() => {
    if (session?.user) void refreshProfile()
    else {
      setProfile(null)
      setProfileLoading(false)
    }
  }, [session, refreshProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase env eksik — mobile/.env dosyasını doldurun')
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : error.message)
  }, [])

  const signOut = useCallback(async () => {
    mfaVerifiedLocally.current = false
    setMfaPendingState(false)
    await clearMfaVerifiedUserId()
    invalidateApiCache()
    await supabase.auth.signOut()
    setProfile(null)
    setProfileLoading(false)
  }, [])

  const value = useMemo<AuthState>(() => ({
    loading,
    profileLoading,
    session,
    user: session?.user ?? null,
    profile,
    configured: isSupabaseConfigured,
    mfaPending,
    setMfaPending,
    markMfaVerified,
    signIn,
    signOut,
    refreshProfile,
  }), [loading, profileLoading, session, profile, mfaPending, setMfaPending, markMfaVerified, signIn, signOut, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
