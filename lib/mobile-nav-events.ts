/** Open tenant mobile sidebar drawer (bottom nav "Menü" button) */
export const MOBILE_SIDEBAR_OPEN_EVENT = 'aura:mobile-sidebar-open'

export function openMobileSidebar() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MOBILE_SIDEBAR_OPEN_EVENT))
}
