'use client'

import { useEffect } from 'react'

/** Register lightweight service worker for offline shell caching */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'development') return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => { /* silent — PWA is optional enhancement */ })
  }, [])

  return null
}
