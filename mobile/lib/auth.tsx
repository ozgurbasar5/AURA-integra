import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

type Profile = {
  tenant_id: string
  role: string
  full_name: string | null
  is_active: boolean
}

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  configured: boolean
  /** MFA challenge açıkken tab'lara geçme */
  mfaPending: boolean
  setMfaPending: (v: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mfaPending, setMfaPending] = useState(false)

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('user_profiles')
      .select('tenant_id, role, full_name, is_active')
      .eq('id', user.id)
      .maybeSingle()
    setProfile((data as Profile | null) ?? null)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) void refreshProfile()
    else setProfile(null)
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
    setMfaPending(false)
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo<AuthState>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    profile,
    configured: isSupabaseConfigured,
    mfaPending,
    setMfaPending,
    signIn,
    signOut,
    refreshProfile,
  }), [loading, session, profile, mfaPending, signIn, signOut, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
