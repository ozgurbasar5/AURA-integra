'use client'

import { useEffect } from 'react'
import { getSavedTheme, applyTheme } from '@/lib/theme'
import { applyColorMode, getColorMode } from '@/lib/color-mode'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getSavedTheme()
    applyTheme(theme)
    applyColorMode(getColorMode())
  }, [])

  return <>{children}</>
}