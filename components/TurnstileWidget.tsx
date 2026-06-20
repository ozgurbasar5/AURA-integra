'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      ready: (cb: () => void) => void
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
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

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    const onReady = () => {
      if (window.turnstile?.ready) {
        window.turnstile.ready(() => resolve())
      } else if (window.turnstile) {
        resolve()
      } else {
        reject(new Error('Turnstile yüklenemedi'))
      }
    }

    if (existing) {
      if (window.turnstile) {
        onReady()
        return
      }
      existing.addEventListener('load', onReady)
      existing.addEventListener('error', () => reject(new Error('Turnstile script hatası')))
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = onReady
    script.onerror = () => reject(new Error('Turnstile script hatası'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export type TurnstileHandle = {
  reset: () => void
}

type Props = {
  siteKey: string
  onToken: (token: string) => void
  onReady?: () => void
  onError?: () => void
  onExpire?: () => void
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { siteKey, onToken, onReady, onError, onExpire },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)
  const onExpireRef = useRef(onExpire)
  const [loadError, setLoadError] = useState(false)

  onTokenRef.current = onToken
  onReadyRef.current = onReady
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
          size: 'normal',
          callback: (token) => {
            onTokenRef.current(token)
            onReadyRef.current?.()
          },
          'error-callback': () => {
            onTokenRef.current('')
            setLoadError(true)
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
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-medium text-slate-600 mb-2">Güvenlik doğrulaması</p>
      <div ref={containerRef} className="min-h-[65px]" aria-label="Cloudflare Turnstile" />
      {loadError && (
        <p className="text-xs text-red-600 mt-2">
          Doğrulama yüklenemedi. Reklam engelleyiciyi kapatın veya sayfayı yenileyin.
        </p>
      )}
    </div>
  )
})

export default TurnstileWidget
