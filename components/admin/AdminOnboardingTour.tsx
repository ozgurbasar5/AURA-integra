'use client'

import { useAdminOnboardingTour } from '@/lib/onboarding/use-admin-onboarding-tour'
import OnboardingSlideOverlay from '@/components/onboarding/OnboardingSlideOverlay'

export default function AdminOnboardingTour() {
  const tour = useAdminOnboardingTour()

  if (!tour.active || !tour.currentStep) return null

  return (
    <OnboardingSlideOverlay
      step={tour.currentStep}
      stepIndex={tour.stepIndex}
      totalSteps={tour.totalSteps}
      moduleProgress={null}
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
