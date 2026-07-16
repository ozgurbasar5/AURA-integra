'use client'

import { useEffect, useState } from 'react'
import { useOnboardingTour } from '@/lib/onboarding/use-onboarding-tour'
import { usePlanLevel } from '@/lib/plan-context'
import { useUserRole } from '@/lib/role-context'
import OnboardingSlideOverlay from '@/components/onboarding/OnboardingSlideOverlay'
import { readLocalSetupWizardDone } from '@/lib/onboarding/persistence'

type Props = {
  userId: string
  onboardingCompleted: boolean
  setupWizardCompleted?: boolean
}

export default function OnboardingTourTrigger({
  userId,
  onboardingCompleted,
  setupWizardCompleted = false,
}: Props) {
  const planLevel = usePlanLevel()
  const { role, isOwner } = useUserRole()
  const [wizardDone, setWizardDone] = useState(
    () => setupWizardCompleted || (!!userId && readLocalSetupWizardDone(userId)),
  )

  // Kurulum sihirbazı bitmeden tur başlatma (üst üste binen overlay önlenir)
  useEffect(() => {
    if (wizardDone) return
    const check = () => {
      if (setupWizardCompleted || (userId && readLocalSetupWizardDone(userId))) {
        setWizardDone(true)
      }
    }
    const id = window.setInterval(check, 800)
    return () => window.clearInterval(id)
  }, [wizardDone, setupWizardCompleted, userId])

  const tour = useOnboardingTour({
    userId,
    role,
    isOwner,
    planLevel,
    onboardingCompleted,
    autoStart: wizardDone,
  })

  if (!tour.active || !tour.currentStep) return null

  return (
    <OnboardingSlideOverlay
      step={tour.currentStep}
      stepIndex={tour.stepIndex}
      totalSteps={tour.totalSteps}
      moduleProgress={tour.moduleProgress}
      playing={tour.playing}
      spotlight={tour.spotlight}
      spotKind={tour.spotKind}
      panelAnchor={tour.panelAnchor}
      onNext={tour.goNext}
      onPrev={tour.goPrev}
      onSkip={tour.skip}
    />
  )
}
