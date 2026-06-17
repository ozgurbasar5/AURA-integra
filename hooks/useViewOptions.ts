'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  applyViewOptions,
  DEFAULT_VIEW_OPTIONS,
  getViewOptions,
  type ViewOptions,
} from '@/lib/user-settings'

const VIEW_OPTS_EVENT = 'aura-view-options-changed'

export function dispatchViewOptionsChanged(opts: ViewOptions) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(VIEW_OPTS_EVENT, { detail: opts }))
}

export function useViewOptions() {
  const [opts, setOpts] = useState<ViewOptions>(DEFAULT_VIEW_OPTIONS)

  useEffect(() => {
    setOpts(getViewOptions())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'aura_view_options') setOpts(getViewOptions())
    }
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<ViewOptions>).detail
      if (detail) setOpts(detail)
      else setOpts(getViewOptions())
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(VIEW_OPTS_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(VIEW_OPTS_EVENT, onCustom)
    }
  }, [])

  const update = useCallback((patch: Partial<ViewOptions>) => {
    const next = { ...getViewOptions(), ...patch }
    applyViewOptions(next)
    setOpts(next)
    dispatchViewOptionsChanged(next)
  }, [])

  return { opts, update }
}
