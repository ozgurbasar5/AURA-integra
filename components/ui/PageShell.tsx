'use client'

import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

/** Standart sayfa sarmalayıcı — tüm modüllerde tutarlı boşluk */
export function PageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-6 pb-10 ${className}`}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  ...rest
}: {
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 rounded-2xl border border-sky-100/80 dark:border-slate-700/80 bg-gradient-to-br from-white via-sky-50/40 to-cyan-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/90 px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
      {...rest}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 dark:via-sky-500/30 to-transparent rounded-t-2xl" />
      <div>
        {eyebrow && (
          <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
          {Icon && (
            <span className="w-10 h-10 rounded-xl bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-600/25">
              <Icon size={18} />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function PageCard({
  title,
  action,
  children,
  className = '',
  noPadding,
  ...rest
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`surface overflow-hidden ${className}`} {...rest}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  )
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Ara...',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
      <input
        className="input pl-11 py-3 rounded-2xl shadow-sm"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`filter-chip ${value === o.key ? 'filter-chip-active' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingCenter() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function ErrorBanner({
  message,
  onRetry,
  className = '',
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 ${className}`}
      role="alert"
    >
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
        >
          Tekrar dene
        </button>
      )}
    </div>
  )
}
