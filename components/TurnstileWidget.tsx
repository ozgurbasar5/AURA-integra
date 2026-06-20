'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()

  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile script yüklenemedi')))
      setTimeout(() => {
        if (window.turnstile) resolve()
      }, 50)
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script yüklenemedi'))
    document.head.appendChild(script)
  })
}

export type TurnstileHandle = {
  reset: () => void
}

type Props = {
  siteKey: string
  onToken: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { siteKey, onToken, onError, onExpire },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onErrorRef = useRef(onError)
  const onExpireRef = useRef(onExpire)
  const [loadError, setLoadError] = useState(false)

  onTokenRef.current = onToken
  onErrorRef.current = onError
  onExpireRef.current = onExpire

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current('')
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false
    setLoadError(false)

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          callback: (token) => onTokenRef.current(token),
          'error-callback': () => {
            onTokenRef.current('')
            onErrorRef.current?.()
          },
          'expired-callback': () => {
            onTokenRef.current('')
            onExpireRef.current?.()
          },
        })
      })
      .catch(() => {
        setLoadError(true)
        onErrorRef.current?.()
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  if (!siteKey) return null

  return (
    <div className="mt-2">
      <div ref={containerRef} className="min-h-[65px]" aria-label="Güvenlik doğrulaması" />
      {loadError && (
        <p className="text-xs text-red-500 mt-1">
          Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyin veya reklam engelleyiciyi kapatın.
        </p>
      )}
    </div>
  )
})

export default TurnstileWidget
