'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, X } from 'lucide-react'
import type { SystemTourStep } from '@/lib/onboarding/tour-steps'
import type { PanelAnchor, SpotlightKind, SpotlightRect } from '@/lib/onboarding/tour-targets'

type ModuleProgress = { module: string; current: number; total: number } | null

type Props = {
  step: SystemTourStep
  stepIndex: number
  totalSteps: number
  moduleProgress: ModuleProgress
  playing: boolean
  spotlight: SpotlightRect | null
  spotKind: SpotlightKind
  panelAnchor: PanelAnchor
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

function Spotlight({ rect, kind }: { rect: SpotlightRect; kind: SpotlightKind }) {
  const ring =
    kind === 'sidebar'
      ? 'ring-sky-400/90 shadow-[0_0_20px_4px_rgba(14,165,233,0.4)] aura-tour-pulse'
      : kind === 'element'
        ? 'ring-sky-300/80 shadow-[0_0_16px_3px_rgba(14,165,233,0.3)] aura-tour-pulse'
        : 'ring-white/20 aura-tour-pulse-soft'

  return (
    <div
      className={`aura-tour-spotlight pointer-events-none fixed rounded-lg ring-2 ${ring}`}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: 10001 }}
    />
  )
}

function OverlayMask({ spot, onAdvance }: { spot: SpotlightRect | null; onAdvance: () => void }) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (spot) {
      const { clientX: x, clientY: y } = e
      const inSpot =
        x >= spot.left && x <= spot.left + spot.width &&
        y >= spot.top && y <= spot.top + spot.height
      if (inSpot) return
    }
    onAdvance()
  }

  return (
    <button
      type="button"
      className="fixed inset-0 z-[10000] cursor-default border-0 p-0 bg-transparent"
      aria-label="Sonraki adım"
      onClick={handleClick}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <defs>
          <mask id="aura-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && (
              <rect x={spot.left} y={spot.top} width={spot.width} height={spot.height} rx="10" fill="black" />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(5,10,24,0.68)" mask="url(#aura-tour-mask)" />
      </svg>
    </button>
  )
}

export default function OnboardingSlideOverlay({
  step,
  stepIndex,
  totalSteps,
  moduleProgress,
  playing,
  spotlight,
  spotKind,
  panelAnchor,
  onNext,
  onPrev,
  onSkip,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onSkip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext, onPrev, onSkip])

  if (!mounted) return null

  const isLast = stepIndex >= totalSteps - 1
  const progressPct = ((stepIndex + 1) / totalSteps) * 100

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    top: panelAnchor.top,
    left: panelAnchor.left,
    width: panelAnchor.width,
  }

  return createPortal(
    <div className="aura-tour-root fixed inset-0 z-[10000]" role="dialog" aria-modal aria-label="Sistem tanıtımı">
      <OverlayMask spot={spotlight} onAdvance={onNext} />
      {spotlight && <Spotlight rect={spotlight} kind={spotKind} />}

      <div
        className={`pointer-events-auto ${playing ? 'opacity-100' : 'opacity-95'}`}
        style={panelStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="rounded-xl border border-white/12 bg-[var(--bg-card)] shadow-2xl overflow-hidden">
          <div className="h-1 bg-[var(--bg-muted)]">
            <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="px-3.5 py-2.5 flex items-start justify-between gap-2 border-b border-[var(--bg-border)]/50">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-sky-500 truncate">
                {moduleProgress
                  ? `${moduleProgress.module} ${moduleProgress.current}/${moduleProgress.total}`
                  : step.module}
                <span className="text-[var(--text-muted)] font-medium normal-case ml-1">
                  · {stepIndex + 1}/{totalSteps}
                </span>
              </p>
              <h2 className="text-sm font-bold text-[var(--text-primary)] leading-snug mt-0.5">{step.title}</h2>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              aria-label="Turu atla"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-3.5 py-2.5">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
          </div>

          <div className="px-3.5 py-2 flex items-center justify-between gap-2 border-t border-[var(--bg-border)]/40 bg-[var(--bg-muted)]/30">
            <button
              type="button"
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--bg-border)] text-[var(--text-primary)] disabled:opacity-30 hover:bg-[var(--bg-muted)]"
            >
              Geri
            </button>
            <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">Boş alan · Enter</span>
            <button
              type="button"
              onClick={onNext}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
            >
              {isLast ? 'Tamamla' : 'İleri'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
