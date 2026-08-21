'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonLoadingProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export default function ButtonLoading({
  loading = false,
  loadingText,
  children,
  disabled,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonLoadingProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  }

  const variantStyles = {
    primary: 'bg-[var(--color-primary)] text-white hover:opacity-90 shadow-sm',
    secondary: 'bg-[var(--bg-card)] border border-[var(--bg-border)] text-[var(--text-primary)] hover:bg-[var(--bg-border)]/50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)]/30',
    outline: 'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />}
      {loading ? (loadingText || children) : children}
    </button>
  )
}
