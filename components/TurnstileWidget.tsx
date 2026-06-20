'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'

export type TurnstileHandle = {
  reset: () => void
}

type Props = {
  siteKey: string
  onToken: (token: string) => void
  onError?: (errorCode?: string) => void
  onExpire?: () => void
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { siteKey, onToken, onError, onExpire },
  ref,
) {
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const clearError = useCallback(() => setErrorCode(null), [])

  useImperativeHandle(ref, () => ({
    reset: () => {
      onToken('')
      clearError()
      setLoading(true)
      turnstileRef.current?.reset()
    },
  }))

  function handleRetry() {
    onToken('')
    clearError()
    setLoading(true)
    setRetryKey(k => k + 1)
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-medium text-slate-600 mb-2">Güvenlik doğrulaması</p>

      {loading && !errorCode && (
        <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin text-sky-500" />
          CAPTCHA yükleniyor…
        </div>
      )}

      {errorCode && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Doğrulama yüklenemedi</p>
            <p className="mt-0.5 text-red-600">
              {errorCode === 'unsupported'
                ? 'Tarayıcınız CAPTCHA desteklemiyor. Farklı bir tarayıcı deneyin.'
                : `Cloudflare hata kodu: ${errorCode}. Panelde widget modunu Interactive yapın ve site/secret key eşleşmesini kontrol edin.`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50"
          >
            <RefreshCw size={12} />
            Tekrar
          </button>
        </div>
      )}

      <div className={errorCode ? 'hidden' : undefined}>
        <Turnstile
          key={`${siteKey}-${retryKey}`}
          ref={turnstileRef}
          siteKey={siteKey}
          options={{
            theme: 'light',
            size: 'normal',
            appearance: 'interaction-only',
            language: 'tr',
          }}
          onWidgetLoad={() => {
            setLoading(false)
            clearError()
          }}
          onSuccess={token => {
            setLoading(false)
            clearError()
            onToken(token)
          }}
          onError={code => {
            setLoading(false)
            const err = code || 'unknown'
            setErrorCode(err)
            onToken('')
            onError?.(err)
          }}
          onExpire={() => {
            onToken('')
            onExpire?.()
          }}
          onUnsupported={() => {
            setLoading(false)
            setErrorCode('unsupported')
            onToken('')
            onError?.('unsupported')
          }}
          scriptOptions={{
            appendTo: 'head',
          }}
        />
      </div>
    </div>
  )
})

export default TurnstileWidget
