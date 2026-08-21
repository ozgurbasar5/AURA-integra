/**
 * AURA İNTEGRA — USER CUSTOMIZATION 2.0
 * Personal Workspace / Preferences / User Experience Core Engine
 * 
 * Hierarchy:
 * USER PREFERENCE > TENANT DEFAULT > ROLE DEFAULT > SYSTEM DEFAULT
 */

export interface DashboardWidgetConfig {
  id: string
  visible: boolean
  order: number
  size?: 'sm' | 'md' | 'lg' | 'full'
}

export interface QuickActionConfig {
  id: string
  visible: boolean
  order: number
}

export interface TablePreferenceConfig {
  visible_columns?: string[]
  sort_key?: string
  sort_asc?: boolean
  page_size?: number
  density?: 'compact' | 'comfortable'
}

export interface SavedViewConfig {
  id: string
  name: string
  module: string
  filters: Record<string, unknown>
  sort_key?: string
  sort_asc?: boolean
  visible_columns?: string[]
  created_at?: string
}

export interface RecentItemConfig {
  id: string
  type: 'service' | 'customer' | 'part' | 'account'
  title: string
  subtitle: string
  href: string
  accessed_at: string
}

export interface FavoriteItemConfig {
  id: string
  type: 'route' | 'record'
  title: string
  href: string
  icon?: string
}

export interface UserPreferences {
  theme: {
    color_mode: 'system' | 'light' | 'dark'
    accent_color?: string
  }
  density: 'comfortable' | 'compact'
  startup_route: string
  dashboard: {
    widgets: DashboardWidgetConfig[]
  }
  quick_actions: {
    items: QuickActionConfig[]
  }
  table_preferences: Record<string, TablePreferenceConfig>
  saved_views: SavedViewConfig[]
  recent_items: RecentItemConfig[]
  favorites: FavoriteItemConfig[]
  mobile_home: {
    widgets: DashboardWidgetConfig[]
    quick_actions: QuickActionConfig[]
  }
  notifications: {
    sms_service: boolean
    sms_pickup: boolean
    stock_alert: boolean
    payment_remind: boolean
    daily_report: boolean
    new_review: boolean
    push_enabled: boolean
    email_enabled: boolean
  }
}

// ─── SYSTEM DEFAULTS ─────────────────────────────────────────────────────────

export const SYSTEM_DEFAULT_PREFERENCES: UserPreferences = {
  theme: {
    color_mode: 'system',
    accent_color: '#0284c7',
  },
  density: 'comfortable',
  startup_route: '/dashboard',
  dashboard: {
    widgets: [
      { id: 'hero', visible: true, order: 1, size: 'full' },
      { id: 'quick_actions', visible: true, order: 2, size: 'full' },
      { id: 'pipeline', visible: true, order: 3, size: 'full' },
      { id: 'cash_summary', visible: true, order: 4, size: 'md' },
      { id: 'today_activity', visible: true, order: 5, size: 'md' },
      { id: 'critical_stock', visible: true, order: 6, size: 'full' },
    ],
  },
  quick_actions: {
    items: [
      { id: 'new_service', visible: true, order: 1 },
      { id: 'new_sale', visible: true, order: 2 },
      { id: 'new_part', visible: true, order: 3 },
      { id: 'kasa_entry', visible: true, order: 4 },
    ],
  },
  table_preferences: {
    services: {
      visible_columns: ['job_no', 'customer_name', 'device', 'status', 'cost', 'created_at'],
      sort_key: 'created_at',
      sort_asc: false,
      page_size: 20,
      density: 'comfortable',
    },
    parts: {
      visible_columns: ['name', 'barcode', 'stock_qty', 'buy_price', 'sell_price'],
      sort_key: 'stock_qty',
      sort_asc: true,
      page_size: 20,
      density: 'comfortable',
    },
  },
  saved_views: [],
  recent_items: [],
  favorites: [],
  mobile_home: {
    widgets: [
      { id: 'active_jobs', visible: true, order: 1 },
      { id: 'quick_actions', visible: true, order: 2 },
      { id: 'today_summary', visible: true, order: 3 },
      { id: 'critical_alerts', visible: true, order: 4 },
    ],
    quick_actions: [
      { id: 'new_service', visible: true, order: 1 },
      { id: 'kasa', visible: true, order: 2 },
      { id: 'stock', visible: true, order: 3 },
    ],
  },
  notifications: {
    sms_service: true,
    sms_pickup: true,
    stock_alert: true,
    payment_remind: false,
    daily_report: false,
    new_review: true,
    push_enabled: true,
    email_enabled: true,
  },
}

// ─── ROLE-AWARE DEFAULTS GENERATOR ──────────────────────────────────────────

export function getRoleDefaultPreferences(role?: string | null): UserPreferences {
  const normRole = (role || 'viewer').trim().toLowerCase()
  const base = JSON.parse(JSON.stringify(SYSTEM_DEFAULT_PREFERENCES)) as UserPreferences

  switch (normRole) {
    case 'teknisyen':
      base.startup_route = '/dashboard/atolye'
      base.dashboard.widgets = [
        { id: 'today_activity', visible: true, order: 1, size: 'full' },
        { id: 'pipeline', visible: true, order: 2, size: 'full' },
        { id: 'critical_stock', visible: true, order: 3, size: 'full' },
        { id: 'quick_notes', visible: true, order: 4, size: 'md' },
      ]
      base.quick_actions.items = [
        { id: 'new_service', visible: true, order: 1 },
        { id: 'use_part', visible: true, order: 2 },
        { id: 'qc_check', visible: true, order: 3 },
      ]
      break

    case 'muhasebe':
      base.startup_route = '/dashboard/finans'
      base.dashboard.widgets = [
        { id: 'cash_summary', visible: true, order: 1, size: 'full' },
        { id: 'today_sales_breakdown', visible: true, order: 2, size: 'md' },
        { id: 'last_shift_summary', visible: true, order: 3, size: 'md' },
      ]
      base.quick_actions.items = [
        { id: 'kasa_entry', visible: true, order: 1 },
        { id: 'kasa_expense', visible: true, order: 2 },
        { id: 'eod_report', visible: true, order: 3 },
      ]
      break

    case 'kasiyer':
    case 'satis':
      base.startup_route = '/dashboard/satis'
      base.dashboard.widgets = [
        { id: 'quick_actions', visible: true, order: 1, size: 'full' },
        { id: 'cash_summary', visible: true, order: 2, size: 'md' },
        { id: 'today_sales_breakdown', visible: true, order: 3, size: 'md' },
      ]
      base.quick_actions.items = [
        { id: 'pos_sale', visible: true, order: 1 },
        { id: 'new_service', visible: true, order: 2 },
        { id: 'kasa_entry', visible: true, order: 3 },
      ]
      break

    case 'tenant_admin':
    case 'admin':
    case 'mudur':
    case 'owner':
      base.startup_route = '/dashboard'
      base.dashboard.widgets = [
        { id: 'hero', visible: true, order: 1, size: 'full' },
        { id: 'cash_summary', visible: true, order: 2, size: 'md' },
        { id: 'pipeline', visible: true, order: 3, size: 'md' },
        { id: 'critical_stock', visible: true, order: 4, size: 'md' },
        { id: 'today_sales_breakdown', visible: true, order: 5, size: 'md' },
        { id: 'last_shift_summary', visible: true, order: 6, size: 'full' },
      ]
      break

    default: // viewer
      base.startup_route = '/dashboard'
      base.dashboard.widgets = [
        { id: 'hero', visible: true, order: 1, size: 'full' },
        { id: 'pipeline', visible: true, order: 2, size: 'full' },
      ]
      base.quick_actions.items = []
      break
  }

  return base
}

// ─── DOMAIN-ISOLATED MERGER & RESOLVER ──────────────────────────────────────

export function resolveUserPreferences(
  userPrefs?: Partial<UserPreferences> | null,
  tenantDefaults?: Partial<UserPreferences> | null,
  role?: string | null,
): UserPreferences {
  const roleDefaults = getRoleDefaultPreferences(role)
  const tenant = tenantDefaults || {}
  const user = userPrefs || {}

  return {
    theme: {
      ...roleDefaults.theme,
      ...(tenant.theme || {}),
      ...(user.theme || {}),
    },
    density: user.density ?? tenant.density ?? roleDefaults.density,
    startup_route: user.startup_route ?? tenant.startup_route ?? roleDefaults.startup_route,
    dashboard: {
      widgets: user.dashboard?.widgets ?? tenant.dashboard?.widgets ?? roleDefaults.dashboard.widgets,
    },
    quick_actions: {
      items: user.quick_actions?.items ?? tenant.quick_actions?.items ?? roleDefaults.quick_actions.items,
    },
    table_preferences: {
      ...roleDefaults.table_preferences,
      ...(tenant.table_preferences || {}),
      ...(user.table_preferences || {}),
    },
    saved_views: user.saved_views ?? tenant.saved_views ?? roleDefaults.saved_views,
    recent_items: user.recent_items ?? roleDefaults.recent_items,
    favorites: user.favorites ?? tenant.favorites ?? roleDefaults.favorites,
    mobile_home: {
      widgets: user.mobile_home?.widgets ?? tenant.mobile_home?.widgets ?? roleDefaults.mobile_home.widgets,
      quick_actions: user.mobile_home?.quick_actions ?? tenant.mobile_home?.quick_actions ?? roleDefaults.mobile_home.quick_actions,
    },
    notifications: {
      ...roleDefaults.notifications,
      ...(tenant.notifications || {}),
      ...(user.notifications || {}),
    },
  }
}

// ─── RECENT ITEMS & FAVORITES HELPERS ───────────────────────────────────────

export function appendRecentItem(
  current: RecentItemConfig[],
  newItem: Omit<RecentItemConfig, 'accessed_at'>,
  maxItems = 10,
): RecentItemConfig[] {
  const filtered = current.filter(item => !(item.type === newItem.type && item.id === newItem.id))
  const entry: RecentItemConfig = {
    ...newItem,
    accessed_at: new Date().toISOString(),
  }
  return [entry, ...filtered].slice(0, maxItems)
}

export function toggleFavoriteItem(
  current: FavoriteItemConfig[],
  item: FavoriteItemConfig,
): FavoriteItemConfig[] {
  const exists = current.some(f => f.href === item.href || (f.id === item.id && f.type === item.type))
  if (exists) {
    return current.filter(f => !(f.href === item.href || (f.id === item.id && f.type === item.type)))
  }
  return [...current, item]
}
