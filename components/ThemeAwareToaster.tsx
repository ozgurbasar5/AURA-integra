'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

export function ThemeAwareToaster() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      expand
      closeButton
      toastOptions={{
        style: theme === 'dark'
          ? {
              background: 'rgba(17, 17, 19, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(39, 39, 42, 0.8)',
              color: '#fafafa',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }
          : {
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              color: '#0f172a',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            },
      }}
    />
  )
}
