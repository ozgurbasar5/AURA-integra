import type { PlanLevel } from '@/lib/plan-tiers'

export type TourRole = 'owner' | 'teknisyen' | 'satis' | 'kasiyer' | 'muhasebe'

export type TourTarget =
  | { kind: 'sidebar'; href: string }
  | { kind: 'element'; id: string }
  | { kind: 'page' }

export type PanelPlacement = 'top' | 'near' | 'bottom'

export type SystemTourStep = {
  route: string
  target: TourTarget
  module: string
  title: string
  description: string
  tips?: string[]
  panel?: PanelPlacement
  minPlan?: PlanLevel
}

export function navStep(
  route: string,
  module: string,
  title: string,
  description: string,
  tips?: string[],
  minPlan?: PlanLevel,
): SystemTourStep {
  return {
    route,
    target: { kind: 'sidebar', href: route },
    module,
    title,
    description,
    tips,
    panel: 'near',
    minPlan,
  }
}

export function el(
  route: string,
  id: string,
  module: string,
  title: string,
  description: string,
  tips?: string[],
  minPlan?: PlanLevel,
): SystemTourStep {
  return {
    route,
    target: { kind: 'element', id },
    module,
    title,
    description,
    tips,
    panel: 'near',
    minPlan,
  }
}

export function pageStep(
  route: string,
  module: string,
  title: string,
  description: string,
  tips?: string[],
  minPlan?: PlanLevel,
): SystemTourStep {
  return {
    route,
    target: { kind: 'page' },
    module,
    title,
    description,
    tips,
    panel: 'near',
    minPlan,
  }
}
