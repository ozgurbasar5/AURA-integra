export const TOUR_PREPARE_EVENT = 'aura:onboarding-prepare'
export const TOUR_MOBILE_SIDEBAR_EVENT = 'aura:onboarding-mobile-sidebar'
export const TOUR_RESTART_EVENT = 'aura:onboarding-restart'

import type { SystemTourStep } from './tour-steps'

export function requestTourRestart() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT))
}

export function prepareTourDom() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOUR_PREPARE_EVENT))
  if (window.innerWidth < 1024) {
    window.dispatchEvent(new CustomEvent(TOUR_MOBILE_SIDEBAR_EVENT))
  }
}

export function isTourElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width < 4 || rect.height < 4) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) {
    return false
  }
  let parent = el.parentElement
  while (parent) {
    const ps = window.getComputedStyle(parent)
    if (ps.display === 'none' || ps.visibility === 'hidden') return false
    if (parent.classList.contains('sidebar-category-panel')) {
      if (parent.getBoundingClientRect().height < 4) return false
    }
    parent = parent.parentElement
  }
  return true
}

export function findSidebarNav(href: string): Element | null {
  const el = document.querySelector(`[data-tour-nav="${href}"]`)
  if (el && isTourElementVisible(el)) return el
  return null
}

export function findTourElement(id: string): Element | null {
  const el = document.querySelector(`[data-tour="${id}"]`)
  if (el && isTourElementVisible(el)) return el
  return null
}

export function findPageStage(): Element | null {
  const main = document.querySelector('main .page-wrapper')
  if (main && isTourElementVisible(main)) return main
  const mainEl = document.querySelector('main')
  if (mainEl && isTourElementVisible(mainEl)) return mainEl
  return null
}

export type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

export type SpotlightKind = 'sidebar' | 'element' | 'page'

export function resolveTourTarget(step: SystemTourStep): { el: Element | null; kind: SpotlightKind } {
  const { target } = step
  if (target.kind === 'sidebar') {
    return { el: findSidebarNav(target.href), kind: 'sidebar' }
  }
  if (target.kind === 'element') {
    const el = findTourElement(target.id)
    if (el) return { el, kind: 'element' }
    return { el: findPageStage(), kind: 'page' }
  }
  return { el: findPageStage(), kind: 'page' }
}

export function toSpotlightRect(el: Element | null, padding = 6): SpotlightRect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: Math.max(0, r.top - padding),
    left: Math.max(0, r.left - padding),
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  }
}

export function scrollIntoTourView(el: Element | null) {
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
}

/** Hedef element DOM'a gelene kadar kısa bekle (sayfa geçişi yok) */
export async function waitForTourTarget(step: SystemTourStep, maxMs = 1800): Promise<Element | null> {
  const end = Date.now() + maxMs
  while (Date.now() < end) {
    const { el } = resolveTourTarget(step)
    if (el) return el
    await new Promise(r => setTimeout(r, 60))
  }
  return resolveTourTarget(step).el
}

export type PanelAnchor = {
  top: number
  left: number
  width: number
  placement: 'above' | 'below' | 'sidebar-right' | 'center'
}

const PANEL_MAX_H = 220
const PANEL_GAP = 10
const HEADER_H = 56

export function computePanelAnchor(
  spot: SpotlightRect | null,
  _panel: 'top' | 'near' | 'bottom' = 'near',
  kind: SpotlightKind = 'element',
): PanelAnchor {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const width = Math.min(340, vw - 20)

  const clampTop = (t: number) => Math.max(HEADER_H + 6, Math.min(t, vh - PANEL_MAX_H - 10))
  const clampLeft = (l: number) => Math.max(10, Math.min(l, vw - width - 10))

  if (kind === 'sidebar' && spot) {
    return {
      top: clampTop(spot.top),
      left: clampLeft(spot.left + spot.width + PANEL_GAP),
      width,
      placement: 'sidebar-right',
    }
  }

  if (!spot) {
    return {
      top: clampTop(HEADER_H + 10),
      left: clampLeft((vw - width) / 2),
      width,
      placement: 'center',
    }
  }

  const belowTop = spot.top + spot.height + PANEL_GAP
  const aboveTop = spot.top - PANEL_MAX_H - PANEL_GAP
  const fitsBelow = belowTop + PANEL_MAX_H <= vh - 10
  const fitsAbove = aboveTop >= HEADER_H + 6

  let top: number
  let placement: PanelAnchor['placement']

  if (fitsBelow) {
    top = belowTop
    placement = 'below'
  } else if (fitsAbove) {
    top = aboveTop
    placement = 'above'
  } else {
    top = clampTop(vh - PANEL_MAX_H - 12)
    placement = 'below'
  }

  let left = spot.left + spot.width / 2 - width / 2
  if (spot.width > width * 0.85) left = spot.left

  return { top: clampTop(top), left: clampLeft(left), width, placement }
}
