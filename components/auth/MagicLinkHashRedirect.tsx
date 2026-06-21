'use client'

import { useEffect } from 'react'

/**
 * Magic link bazen Site URL köküne (#access_token) düşer.
 * Hash varsa /auth/callback sayfasına yönlendir (client-only).
 */
export default function MagicLinkHashRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash.includes('access_token=')) return
    if (window.location.pathname === '/auth/callback') return

    const search = window.location.search || ''
    window.location.replace(`/auth/callback${search}${hash}`)
  }, [])

  return null
}
