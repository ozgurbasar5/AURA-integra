import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import {
  DEFAULT_APPEARANCE,
  loadAppearance,
  resolveColors,
  saveAppearance,
  type MobileAppearance,
  type ThemeColors,
} from './appearance'

type ThemeCtx = {
  ready: boolean
  appearance: MobileAppearance
  colors: ThemeColors
  isDark: boolean
  setAppearance: (patch: Partial<MobileAppearance>) => void
  resetAppearance: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme()
  const [ready, setReady] = useState(false)
  const [appearance, setAppearanceState] = useState<MobileAppearance>(DEFAULT_APPEARANCE)

  useEffect(() => {
    void loadAppearance().then(a => {
      setAppearanceState(a)
      setReady(true)
    })
  }, [])

  const isDark =
    appearance.colorMode === 'dark' ||
    (appearance.colorMode === 'system' && system === 'dark')

  const colors = useMemo(() => resolveColors(appearance, isDark), [appearance, isDark])

  const setAppearance = useCallback((patch: Partial<MobileAppearance>) => {
    setAppearanceState(prev => {
      const next = { ...prev, ...patch }
      void saveAppearance(next)
      return next
    })
  }, [])

  const resetAppearance = useCallback(() => {
    setAppearanceState(DEFAULT_APPEARANCE)
    void saveAppearance(DEFAULT_APPEARANCE)
  }, [])

  const value = useMemo(
    () => ({ ready, appearance, colors, isDark, setAppearance, resetAppearance }),
    [ready, appearance, colors, isDark, setAppearance, resetAppearance],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider')
  return ctx
}
