'use client'

import { useEffect } from 'react'

/**
 * Magic link bazen Site URL köküne (#access_token) düşer.
 * Hash client route: /auth/session (/auth/callback = server route.ts only)
 */
export default function MagicLinkHashRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash.includes('access_token=')) return
    if (window.location.pathname === '/auth/session') return

    const search = window.location.search || ''
    window.location.replace(`/auth/session${search}${hash}`)
  }, [])

  return null
}
