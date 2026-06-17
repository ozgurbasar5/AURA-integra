import type { PlanLevel } from '@/lib/plan-tiers'
import { isRouteAllowed } from '@/lib/plan-tiers'
import { isRouteAllowedForRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'
import type { SystemTourStep, TourRole } from './tour-types'
import { OWNER_FLOW } from './flows/owner'
import { KASIYER_FLOW, MUHASEBE_FLOW, SALES_FLOW, TECHNICIAN_FLOW } from './flows/roles'

export type { SystemTourStep, TourTarget, PanelPlacement } from './tour-types'

function resolveTourRole(role: string, isOwner: boolean): TourRole {
  if (isOwner) return 'owner'
  const n = normalizeTenantRole(role)
  if (n === 'teknisyen') return 'teknisyen'
  if (n === 'satis') return 'satis'
  if (n === 'kasiyer') return 'kasiyer'
  if (n === 'muhasebe') return 'muhasebe'
  return 'owner'
}

function flowForRole(tourRole: TourRole): SystemTourStep[] {
  switch (tourRole) {
    case 'teknisyen': return TECHNICIAN_FLOW
    case 'satis': return SALES_FLOW
    case 'kasiyer': return KASIYER_FLOW
    case 'muhasebe': return MUHASEBE_FLOW
    default: return OWNER_FLOW
  }
}

function filterSteps(
  steps: SystemTourStep[],
  planLevel: PlanLevel,
  normalizedRole: string,
  isOwner: boolean,
): SystemTourStep[] {
  return steps.filter(step => {
    if (step.minPlan && planLevel < step.minPlan) return false
    if (!isRouteAllowed(step.route, planLevel)) return false
    if (!isRouteAllowedForRole(step.route, normalizedRole) && !isOwner) return false
    if (step.target.kind === 'sidebar' && !isRouteAllowed(step.target.href, planLevel)) return false
    if (step.target.kind === 'sidebar' && !isRouteAllowedForRole(step.target.href, normalizedRole) && !isOwner) return false
    return true
  })
}

export function getSystemTourSteps(
  role: string,
  isOwner: boolean,
  planLevel: PlanLevel,
): SystemTourStep[] {
  const tourRole = resolveTourRole(role, isOwner)
  const normalized = normalizeTenantRole(role)
  return filterSteps(flowForRole(tourRole), planLevel, normalized, isOwner)
}

/** Modül içi ilerleme: "Stok · 3/7" */
export function getModuleProgress(steps: SystemTourStep[], index: number): { module: string; current: number; total: number } | null {
  const step = steps[index]
  if (!step) return null
  const moduleName = step.module
  const moduleSteps = steps.filter(s => s.module === moduleName)
  const current = moduleSteps.findIndex(s => s === step) + 1
  return { module: moduleName, current, total: moduleSteps.length }
}
