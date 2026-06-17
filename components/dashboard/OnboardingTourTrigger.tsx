'use client'

import { useOnboardingTour } from '@/lib/onboarding/use-onboarding-tour'
import { usePlanLevel } from '@/lib/plan-context'
import { useUserRole } from '@/lib/role-context'
import OnboardingSlideOverlay from '@/components/onboarding/OnboardingSlideOverlay'

type Props = {
  onboardingCompleted: boolean
}

export default function OnboardingTourTrigger({ onboardingCompleted }: Props) {
  const planLevel = usePlanLevel()
  const { role, isOwner } = useUserRole()

  const tour = useOnboardingTour({
    role,
    isOwner,
    planLevel,
    onboardingCompleted,
    autoStart: true,
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
