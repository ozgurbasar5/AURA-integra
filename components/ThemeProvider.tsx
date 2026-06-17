'use client'

import { useEffect } from 'react'
import { getSavedTheme } from '@/lib/theme'
import { applyColorMode, getColorMode } from '@/lib/color-mode'
import { applyUiAppearance, getUiAppearance } from '@/lib/ui-appearance'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const appearance = getUiAppearance()
    applyUiAppearance({ ...appearance, theme: getSavedTheme() })
    applyColorMode(getColorMode())
  }, [])

  return <>{children}</>
}
