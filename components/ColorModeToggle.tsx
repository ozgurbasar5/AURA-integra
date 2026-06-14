'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyColorMode, getColorMode, type ColorMode } from '@/lib/color-mode'

export default function ColorModeToggle({ compact }: { compact?: boolean }) {
  const [mode, setMode] = useState<ColorMode>('light')

  useEffect(() => {
    setMode(getColorMode())
  }, [])

  function toggle() {
    const next = mode === 'dark' ? 'light' : 'dark'
    applyColorMode(next)
    setMode(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={mode === 'dark' ? 'Açık mod' : 'Koyu mod'}
      className={`flex items-center justify-center rounded-xl transition-all ${
        compact
          ? 'w-9 h-9 text-slate-400 hover:text-white hover:bg-white/10'
          : 'gap-2 px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] border border-[var(--bg-border)]'
      }`}
    >
      {mode === 'dark' ? <Sun size={compact ? 17 : 16} /> : <Moon size={compact ? 17 : 16} />}
      {!compact && <span>{mode === 'dark' ? 'Açık' : 'Koyu'}</span>}
    </button>
  )
}
