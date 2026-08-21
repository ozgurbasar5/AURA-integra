'use client'

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = 'Bir hata oluştu',
  message,
  description,
  onRetry,
  retryLabel = 'Tekrar Dene',
  className = '',
}: ErrorStateProps) {
  const displayMessage = description || message || 'Veriler yüklenirken geçici bir sorun meydana geldi. Lütfen tekrar deneyin.'

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-red-500/20 bg-red-500/5 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h4>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
        {displayMessage}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export default ErrorState
