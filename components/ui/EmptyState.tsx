'use client'

import React from 'react'
import { Inbox, Plus } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[var(--bg-border)] bg-[var(--bg-card)]/50 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-5">
          {description}
        </p>
      )}
      {actionLabel && (
        <>
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </a>
          ) : onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}

export default EmptyState
