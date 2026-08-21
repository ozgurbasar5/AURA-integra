'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SYSTEM_DEFAULT_PREFERENCES,
  resolveUserPreferences,
  appendRecentItem,
  toggleFavoriteItem,
  type UserPreferences,
  type TablePreferenceConfig,
  type SavedViewConfig,
  type RecentItemConfig,
  type FavoriteItemConfig,
} from '@/lib/user-preferences'

const PREFERENCES_STORAGE_KEY = 'aura_user_preferences_cache'

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(SYSTEM_DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [isCustomized, setIsCustomized] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const abortCtrlRef = useRef<AbortController | null>(null)

  // Apply UI side-effects (DOM classes & CSS variables)
  const applyDomPreferences = useCallback((prefs: UserPreferences) => {
    if (typeof document === 'undefined') return
    const html = document.documentElement

    // Density
    html.classList.toggle('ui-compact', prefs.density === 'compact')

    // Theme
    if (prefs.theme.color_mode === 'dark') {
      html.classList.add('dark')
    } else if (prefs.theme.color_mode === 'light') {
      html.classList.remove('dark')
    }

    // Accent Color
    if (prefs.theme?.accent_color) {
      html.style.setProperty('--accent-color', prefs.theme.accent_color)
    }
  }, [])

  // Fetch from server
  const fetchPreferences = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/me/preferences', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await res.json()
        if (json.ok && json.preferences) {
          setPreferences(json.preferences)
          setIsCustomized(Boolean(json.is_customized))
          applyDomPreferences(json.preferences)
          if (typeof window !== 'undefined') {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(json.preferences))
          }
        }
      }
    } catch {
      /* ignore offline / network error */
    } finally {
      setLoading(false)
    }
  }, [applyDomPreferences])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(PREFERENCES_STORAGE_KEY)
        if (cached) {
          const parsed = resolveUserPreferences(JSON.parse(cached))
          setPreferences(parsed)
          applyDomPreferences(parsed)
        }
      }
    } catch {
      /* ignore cache read error */
    }
    void fetchPreferences()
  }, [fetchPreferences, applyDomPreferences])

  // Update preferences with optimistic update and rollback
  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      const prev = preferences
      const next = resolveUserPreferences({ ...preferences, ...patch })

      // Optimistic update
      setPreferences(next)
      applyDomPreferences(next)
      if (typeof window !== 'undefined') {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next))
      }

      setSyncing(true)
      try {
        if (abortCtrlRef.current) abortCtrlRef.current.abort()
        const abortCtrl = new AbortController()
        abortCtrlRef.current = abortCtrl

        const res = await fetch('/api/tenant/me/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
          signal: abortCtrl.signal,
          credentials: 'same-origin',
        })

        if (!res.ok) {
          throw new Error('Tercihler kaydedilemedi')
        }

        const json = await res.json()
        if (json.ok && json.preferences) {
          setPreferences(json.preferences)
          setIsCustomized(true)
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Rollback on non-abort failure
          setPreferences(prev)
          applyDomPreferences(prev)
          if (typeof window !== 'undefined') {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prev))
          }
          throw err
        }
      } finally {
        setSyncing(false)
      }
    },
    [preferences, applyDomPreferences],
  )

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/tenant/me/preferences/reset', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (res.ok) {
        const json = await res.json()
        if (json.ok && json.preferences) {
          setPreferences(json.preferences)
          setIsCustomized(false)
          applyDomPreferences(json.preferences)
          if (typeof window !== 'undefined') {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(json.preferences))
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSyncing(false)
    }
  }, [applyDomPreferences])

  // Track recent item
  const trackRecentItem = useCallback(
    (item: Omit<RecentItemConfig, 'accessed_at'>) => {
      const nextRecent = appendRecentItem(preferences.recent_items || [], item)
      void updatePreferences({ recent_items: nextRecent })
    },
    [preferences.recent_items, updatePreferences],
  )

  // Toggle favorite
  const toggleFavorite = useCallback(
    (item: FavoriteItemConfig) => {
      const nextFavs = toggleFavoriteItem(preferences.favorites || [], item)
      void updatePreferences({ favorites: nextFavs })
    },
    [preferences.favorites, updatePreferences],
  )

  // Save table preferences
  const saveTablePreferences = useCallback(
    (tableId: string, tableConfig: Partial<TablePreferenceConfig>) => {
      const current = preferences.table_preferences?.[tableId] || {}
      const updatedTable = { ...current, ...tableConfig }
      void updatePreferences({
        table_preferences: {
          ...(preferences.table_preferences || {}),
          [tableId]: updatedTable,
        },
      })
    },
    [preferences.table_preferences, updatePreferences],
  )

  // Save / update view
  const saveView = useCallback(
    (view: SavedViewConfig) => {
      const current = preferences.saved_views || []
      const filtered = current.filter(v => v.id !== view.id)
      const next = [...filtered, { ...view, created_at: new Date().toISOString() }]
      void updatePreferences({ saved_views: next })
    },
    [preferences.saved_views, updatePreferences],
  )

  // Delete saved view
  const deleteView = useCallback(
    (viewId: string) => {
      const current = preferences.saved_views || []
      const next = current.filter(v => v.id !== viewId)
      void updatePreferences({ saved_views: next })
    },
    [preferences.saved_views, updatePreferences],
  )

  return {
    preferences,
    loading,
    syncing,
    isCustomized,
    updatePreferences,
    resetToDefaults,
    trackRecentItem,
    toggleFavorite,
    saveTablePreferences,
    saveView,
    deleteView,
    refetch: fetchPreferences,
  }
}
