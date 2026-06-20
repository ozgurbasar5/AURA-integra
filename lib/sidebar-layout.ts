import type { ViewOptions } from '@/lib/user-settings'

export type SidebarLayout = 'classic' | 'accordion' | 'accordion_open'

export interface TenantSidebarSettings {
  sidebar_layout: SidebarLayout
  sidebar_default_expanded: string[]
  enforce_tenant_default: boolean
}

export const DEFAULT_TENANT_SIDEBAR: TenantSidebarSettings = {
  sidebar_layout: 'classic',
  sidebar_default_expanded: [],
  enforce_tenant_default: false,
}

export function isAccordionLayout(layout: SidebarLayout): boolean {
  return layout === 'accordion' || layout === 'accordion_open'
}

/** Kullanıcı + bayi ayarından etkin sidebar düzenini çöz */
export function resolveSidebarLayout(
  viewOpts: ViewOptions,
  tenant?: TenantSidebarSettings | null,
): SidebarLayout {
  const tenantSettings = tenant ?? DEFAULT_TENANT_SIDEBAR

  if (tenantSettings.enforce_tenant_default) {
    return tenantSettings.sidebar_layout
  }

  if (viewOpts.useTenantSidebarDefault) {
    return tenantSettings.sidebar_layout
  }

  if (viewOpts.sidebarLayout) return viewOpts.sidebarLayout

  return viewOpts.sidebarMode === 'categorized' ? 'accordion' : 'classic'
}

export function parseTenantSidebarSettings(raw: unknown): TenantSidebarSettings {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const layout = obj.sidebar_layout
  const validLayout =
    layout === 'classic' || layout === 'accordion' || layout === 'accordion_open'
      ? layout
      : DEFAULT_TENANT_SIDEBAR.sidebar_layout

  const expanded = Array.isArray(obj.sidebar_default_expanded)
    ? obj.sidebar_default_expanded.filter((x): x is string => typeof x === 'string')
    : DEFAULT_TENANT_SIDEBAR.sidebar_default_expanded

  return {
    sidebar_layout: validLayout,
    sidebar_default_expanded: expanded,
    enforce_tenant_default: Boolean(obj.enforce_tenant_default),
  }
}
