'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: string
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'rounded-lg',
}: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <div
      style={style}
      className={`animate-pulse bg-[var(--bg-border)]/60 ${rounded} ${className}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] flex flex-col gap-3">
      <Skeleton height="1.25rem" width="40%" />
      <Skeleton height="0.875rem" width="80%" />
      <Skeleton height="0.875rem" width="60%" />
    </div>
  )
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center p-3 rounded-xl bg-[var(--bg-card)]/40">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              height="1rem"
              className={c === 0 ? 'w-1/4' : 'flex-1'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default Skeleton
