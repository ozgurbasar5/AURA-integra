'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

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
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  useImperativeHandle(ref, () => ({
    reset: () => {
      onToken('')
      turnstileRef.current?.reset()
    },
  }))

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-medium text-slate-600 mb-2">Güvenlik doğrulaması</p>
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        options={{
          theme: 'light',
          size: 'normal',
          appearance: 'always',
          language: 'tr',
        }}
        onSuccess={onToken}
        onError={() => onError?.()}
        onExpire={() => {
          onToken('')
          onExpire?.()
        }}
        scriptOptions={{
          appendTo: 'head',
        }}
      />
    </div>
  )
})

export default TurnstileWidget
