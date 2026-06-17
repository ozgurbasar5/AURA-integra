'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getModuleProgress, getSystemTourSteps, type SystemTourStep } from './tour-steps'
import {
  TOUR_RESTART_EVENT,
  computePanelAnchor,
  prepareTourDom,
  resolveTourTarget,
  scrollIntoTourView,
  toSpotlightRect,
  waitForTourTarget,
  type PanelAnchor,
  type SpotlightKind,
  type SpotlightRect,
} from './tour-targets'

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function markOnboardingCompleted(completed: boolean) {
  try {
    await fetch('/api/tenant/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_completed: completed }),
    })
  } catch { /* sessiz */ }
}

async function waitForTourBlockersClear() {
  const end = Date.now() + 12000
  while (Date.now() < end) {
    if (!document.querySelector('[data-aura-setup-wizard]')) return
    await delay(300)
  }
}

type Options = {
  role: string
  isOwner: boolean
  planLevel: number
  onboardingCompleted: boolean
  autoStart?: boolean
}

export function useOnboardingTour({
  role,
  isOwner,
  planLevel,
  onboardingCompleted,
  autoStart = true,
}: Options) {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const steps = useMemo(
    () => getSystemTourSteps(role, isOwner, planLevel as 1 | 2 | 3),
    [role, isOwner, planLevel],
  )

  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [spotKind, setSpotKind] = useState<SpotlightKind>('page')
  const [panelAnchor, setPanelAnchor] = useState<PanelAnchor>({ top: 64, left: 280, width: 340, placement: 'sidebar-right' })

  const autoStartedRef = useRef(false)
  const pendingRestartRef = useRef(false)
  const expectedRouteRef = useRef<string | null>(null)
  const completingRef = useRef(false)

  const currentStep = steps[stepIndex] ?? null
  const moduleProgress = useMemo(
    () => (currentStep ? getModuleProgress(steps, stepIndex) : null),
    [steps, stepIndex, currentStep],
  )

  const updateSpotlight = useCallback(async (step: SystemTourStep) => {
    if (step.target.kind === 'sidebar') prepareTourDom()

    const el = await waitForTourTarget(step, step.target.kind === 'element' ? 1200 : 400)
    const { kind } = resolveTourTarget(step)
    scrollIntoTourView(el)

    const pad = kind === 'sidebar' ? 5 : kind === 'element' ? 8 : 4
    const spot = toSpotlightRect(el, pad)
    const panel = step.panel ?? (kind === 'sidebar' ? 'top' : 'near')

    setSpotKind(kind)
    setSpotlight(spot)
    setPanelAnchor(computePanelAnchor(spot, panel, kind))
    setPlaying(true)
  }, [])

  const finishTour = useCallback(async () => {
    if (completingRef.current) return
    completingRef.current = true
    setActive(false)
    setPlaying(false)
    setSpotlight(null)
    expectedRouteRef.current = null
    await markOnboardingCompleted(true)
    completingRef.current = false
  }, [])

  const revealStep = useCallback(
    async (index: number) => {
      const step = steps[index]
      if (!step) return

      setPlaying(false)
      const needsNav = pathnameRef.current !== step.route

      if (needsNav) {
        expectedRouteRef.current = step.route
        router.push(step.route)
        return
      }

      await updateSpotlight(step)
    },
    [steps, router, updateSpotlight],
  )

  const startTour = useCallback(
    async (opts?: { force?: boolean }) => {
      if (steps.length === 0) {
        if (opts?.force) toast.error('Rolünüz için tur adımı bulunamadı.')
        return
      }
      await waitForTourBlockersClear()
      setActive(true)
      setStepIndex(0)
      await revealStep(0)
    },
    [steps, revealStep],
  )

  const goNext = useCallback(() => {
    if (!currentStep) return
    if (stepIndex >= steps.length - 1) {
      void finishTour()
      return
    }
    const next = stepIndex + 1
    setStepIndex(next)
    void revealStep(next)
  }, [currentStep, stepIndex, steps.length, finishTour, revealStep])

  const goPrev = useCallback(() => {
    if (stepIndex <= 0) return
    const prev = stepIndex - 1
    setStepIndex(prev)
    void revealStep(prev)
  }, [stepIndex, revealStep])

  const runTourWithNav = useCallback(() => {
    const firstRoute = steps[0]?.route ?? '/dashboard'
    if (pathnameRef.current !== firstRoute) {
      pendingRestartRef.current = true
      router.push(firstRoute)
      return
    }
    void startTour({ force: true })
  }, [router, startTour, steps])

  useEffect(() => {
    if (!active || !expectedRouteRef.current) return
    if (pathname !== expectedRouteRef.current) return

    const step = steps[stepIndex]
    if (!step) return

    expectedRouteRef.current = null
    void (async () => {
      prepareTourDom()
      await delay(120)
      await updateSpotlight(step)
    })()
  }, [active, pathname, stepIndex, steps, updateSpotlight])

  useEffect(() => {
    if (!active || !playing || !currentStep) return
    const onReflow = () => {
      const { el, kind } = resolveTourTarget(currentStep)
      const pad = kind === 'sidebar' ? 5 : kind === 'element' ? 8 : 4
      const spot = toSpotlightRect(el, pad)
      setSpotlight(spot)
      setPanelAnchor(computePanelAnchor(spot, currentStep.panel ?? 'near', kind))
    }
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [active, playing, currentStep])

  useEffect(() => {
    if (!autoStart || onboardingCompleted || autoStartedRef.current) return
    autoStartedRef.current = true
    const t = window.setTimeout(() => void startTour(), 2800)
    return () => clearTimeout(t)
  }, [autoStart, onboardingCompleted, startTour])

  useEffect(() => {
    if (!pendingRestartRef.current) return
    pendingRestartRef.current = false
    const t = window.setTimeout(() => void startTour({ force: true }), 400)
    return () => clearTimeout(t)
  }, [pathname, startTour])

  useEffect(() => {
    const onRestart = () => runTourWithNav()
    window.addEventListener(TOUR_RESTART_EVENT, onRestart)
    return () => window.removeEventListener(TOUR_RESTART_EVENT, onRestart)
  }, [runTourWithNav])

  useEffect(() => {
    if (!active) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [active])

  return {
    active,
    currentStep,
    stepIndex,
    totalSteps: steps.length,
    moduleProgress,
    playing,
    spotlight,
    spotKind,
    panelAnchor,
    goNext,
    goPrev,
    skip: finishTour,
    startTour,
  }
}
