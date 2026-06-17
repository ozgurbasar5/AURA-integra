'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: {
        sitekey: string
        callback: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
      }) => string
      reset: (widgetId: string) => void
    }
  }
}

type Props = {
  onToken: (token: string) => void
  onError?: () => void
}

export default function TurnstileWidget({ onToken, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !ref.current) return

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      if (!ref.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onToken,
        'error-callback': onError,
        'expired-callback': () => onToken(''),
      })
    }
    document.body.appendChild(script)
    return () => { script.remove() }
  }, [siteKey, onToken, onError])

  if (!siteKey) return null
  return <div ref={ref} className="mt-2" />
}
