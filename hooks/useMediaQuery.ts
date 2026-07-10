'use client'

import { useEffect, useState } from 'react'

/** Tailwind `lg` breakpoint — sidebar drawer vs fixed sidebar */
export const LG_BREAKPOINT = 1024

/** Tailwind `md` breakpoint */
export const MD_BREAKPOINT = 768

function getMatch(query: string): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

/**
 * Subscribe to a CSS media query. SSR-safe: returns `defaultValue` until mounted.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Viewport < 1024px (mobile/tablet drawer mode) */
export function useIsMobileNav(): boolean {
  return useMediaQuery(`(max-width: ${LG_BREAKPOINT - 1}px)`)
}

/** Viewport < 768px (phone layout) */
export function useIsPhone(): boolean {
  return useMediaQuery(`(max-width: ${MD_BREAKPOINT - 1}px)`)
}

/** Viewport >= 1024px */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${LG_BREAKPOINT}px)`)
}
