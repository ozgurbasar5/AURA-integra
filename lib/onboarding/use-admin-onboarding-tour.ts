'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAdminTourSteps } from '@/lib/onboarding/admin-flow'
import type { SystemTourStep } from '@/lib/onboarding/tour-steps'
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
} from '@/lib/onboarding/tour-targets'

const STORAGE_KEY = 'aura_admin_tour_done'

export function requestAdminTourRestart() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT))
}

export function useAdminOnboardingTour() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const steps = useMemo(() => getAdminTourSteps(), [])
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [spotKind, setSpotKind] = useState<SpotlightKind>('page')
  const [panelAnchor, setPanelAnchor] = useState<PanelAnchor>({ top: 64, left: 280, width: 340, placement: 'sidebar-right' })

  const autoStartedRef = useRef(false)
  const expectedRouteRef = useRef<string | null>(null)
  const currentStep = steps[stepIndex] ?? null

  const updateSpotlight = useCallback(async (step: SystemTourStep) => {
    if (step.target.kind === 'sidebar') prepareTourDom()
    const el = await waitForTourTarget(step, 1000)
    const { kind } = resolveTourTarget(step)
    scrollIntoTourView(el)
    const spot = toSpotlightRect(el, kind === 'sidebar' ? 5 : 8)
    setSpotKind(kind)
    setSpotlight(spot)
    setPanelAnchor(computePanelAnchor(spot, step.panel ?? 'near', kind))
    setPlaying(true)
  }, [])

  const finishTour = useCallback(() => {
    setActive(false)
    setPlaying(false)
    setSpotlight(null)
    localStorage.setItem(STORAGE_KEY, '1')
  }, [])

  const revealStep = useCallback(async (index: number) => {
    const step = steps[index]
    if (!step) return
    setPlaying(false)
    if (pathnameRef.current !== step.route) {
      expectedRouteRef.current = step.route
      router.push(step.route)
      return
    }
    await updateSpotlight(step)
  }, [steps, router, updateSpotlight])

  const startTour = useCallback(async () => {
    setActive(true)
    setStepIndex(0)
    await revealStep(0)
  }, [revealStep])

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) { finishTour(); return }
    const next = stepIndex + 1
    setStepIndex(next)
    void revealStep(next)
  }, [stepIndex, steps.length, finishTour, revealStep])

  const goPrev = useCallback(() => {
    if (stepIndex <= 0) return
    const prev = stepIndex - 1
    setStepIndex(prev)
    void revealStep(prev)
  }, [stepIndex, revealStep])

  useEffect(() => {
    if (!active || !expectedRouteRef.current || pathname !== expectedRouteRef.current) return
    expectedRouteRef.current = null
    const step = steps[stepIndex]
    if (step) void updateSpotlight(step)
  }, [active, pathname, stepIndex, steps, updateSpotlight])

  useEffect(() => {
    if (autoStartedRef.current) return
    if (localStorage.getItem(STORAGE_KEY)) return
    autoStartedRef.current = true
    const t = setTimeout(() => void startTour(), 2000)
    return () => clearTimeout(t)
  }, [startTour])

  useEffect(() => {
    const onRestart = () => void startTour()
    window.addEventListener(TOUR_RESTART_EVENT, onRestart)
    return () => window.removeEventListener(TOUR_RESTART_EVENT, onRestart)
  }, [startTour])

  return { active, currentStep, stepIndex, totalSteps: steps.length, playing, spotlight, spotKind, panelAnchor, goNext, goPrev, skip: finishTour }
}
