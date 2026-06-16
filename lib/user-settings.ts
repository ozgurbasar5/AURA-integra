export interface NotificationPrefs {
  sms_service: boolean
  sms_pickup: boolean
  stock_alert: boolean
  payment_remind: boolean
  daily_report: boolean
  new_review: boolean
}

export interface PortalSettings {
  slug: string
  sms_enabled: boolean
  otp_enabled: boolean
  kvkk_auto: boolean
}

export interface ViewOptions {
  compact: boolean
  noAnim: boolean
  highContrast: boolean
  sidebarMode: 'classic' | 'categorized'
  sidebarPersistCollapse: boolean
}

const NOTIF_PREFS_KEY = 'aura_notification_prefs'
const PORTAL_PREFS_KEY = 'aura_portal_settings'
const VIEW_OPTS_KEY = 'aura_view_options'

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  sms_service: true,
  sms_pickup: true,
  stock_alert: true,
  payment_remind: false,
  daily_report: false,
  new_review: true,
}

export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  slug: '',
  sms_enabled: true,
  otp_enabled: true,
  kvkk_auto: true,
}

export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIFICATION_PREFS }
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS }
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS }
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof window === 'undefined') return
  localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs))
}

export function getPortalSettings(): PortalSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_PORTAL_SETTINGS }
  try {
    const raw = localStorage.getItem(PORTAL_PREFS_KEY)
    if (!raw) return { ...DEFAULT_PORTAL_SETTINGS }
    return { ...DEFAULT_PORTAL_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PORTAL_SETTINGS }
  }
}

export function savePortalSettings(settings: PortalSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PORTAL_PREFS_KEY, JSON.stringify(settings))
}

export function getViewOptions(): ViewOptions {
  if (typeof window === 'undefined') {
    return {
      compact: false,
      noAnim: false,
      highContrast: false,
      sidebarMode: 'classic',
      sidebarPersistCollapse: false,
    }
  }
  try {
    const raw = localStorage.getItem(VIEW_OPTS_KEY)
    const defaults: ViewOptions = {
      compact: false,
      noAnim: false,
      highContrast: false,
      sidebarMode: 'classic',
      sidebarPersistCollapse: false,
    }
    if (!raw) return defaults
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return {
      compact: false,
      noAnim: false,
      highContrast: false,
      sidebarMode: 'classic',
      sidebarPersistCollapse: false,
    }
  }
}

export function applyViewOptions(opts: ViewOptions) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.classList.toggle('ui-compact', opts.compact)
  html.classList.toggle('ui-no-anim', opts.noAnim)
  html.classList.toggle('ui-high-contrast', opts.highContrast)
  localStorage.setItem(VIEW_OPTS_KEY, JSON.stringify(opts))
}
