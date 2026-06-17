/**
 * Panel görünüm tercihleri — tema rengi + sidebar + yoğunluk + köşe
 */

import {
  THEMES,
  type ThemeKey,
  getThemeVars,
  getSavedTheme,
  applyTheme as applyThemeKey,
} from './theme'

export type SidebarStyle = 'themed' | 'dark' | 'light'
export type RadiusScale = 'sharp' | 'rounded' | 'pill'

export interface UiAppearance {
  theme: ThemeKey
  sidebarStyle: SidebarStyle
  radiusScale: RadiusScale
  customAccent: string | null
}

const STORAGE_KEY = 'aura_ui_appearance'

export const DEFAULT_UI_APPEARANCE: UiAppearance = {
  theme: 'indigo',
  sidebarStyle: 'themed',
  radiusScale: 'rounded',
  customAccent: null,
}

function darken(hex: string, amount = 0.35): string {
  const n = hex.replace('#', '')
  const r = Math.max(0, parseInt(n.slice(0, 2), 16) * (1 - amount))
  const g = Math.max(0, parseInt(n.slice(2, 4), 16) * (1 - amount))
  const b = Math.max(0, parseInt(n.slice(4, 6), 16) * (1 - amount))
  return `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')}`
}

function sidebarVarsForStyle(style: SidebarStyle, accent: string, accentDark: string): Record<string, string> {
  if (style === 'light') {
    return {
      '--sidebar-from': '#f8fafc',
      '--sidebar-to': '#f1f5f9',
      '--sidebar-text': '#475569',
      '--sidebar-text-active': '#0f172a',
      '--sidebar-hover': 'rgba(15,23,42,0.06)',
      '--sidebar-active-bg': 'var(--accent-light)',
      '--sidebar-active-border': 'var(--accent)',
      '--sidebar-border': '#e2e8f0',
      '--sidebar-muted': '#94a3b8',
    }
  }
  if (style === 'dark') {
    return {
      '--sidebar-from': '#0f172a',
      '--sidebar-to': '#020617',
      '--sidebar-text': '#94a3b8',
      '--sidebar-text-active': '#f8fafc',
      '--sidebar-hover': 'rgba(255,255,255,0.05)',
      '--sidebar-active-bg': 'rgba(56,189,248,0.15)',
      '--sidebar-active-border': '#38bdf8',
      '--sidebar-border': 'rgba(255,255,255,0.05)',
      '--sidebar-muted': '#64748b',
    }
  }
  // themed — accent tabanlı gradient
  const from = darken(accentDark, 0.55)
  const to = darken(accentDark, 0.75)
  return {
    '--sidebar-from': from,
    '--sidebar-to': to,
    '--sidebar-text': '#cbd5e1',
    '--sidebar-text-active': '#ffffff',
    '--sidebar-hover': 'rgba(255,255,255,0.08)',
    '--sidebar-active-bg': `${accent}26`,
    '--sidebar-active-border': accent,
    '--sidebar-border': 'rgba(255,255,255,0.08)',
    '--sidebar-muted': '#94a3b8',
  }
}

const RADIUS_MAP: Record<RadiusScale, string> = {
  sharp: '0.375rem',
  rounded: '0.75rem',
  pill: '1.25rem',
}

export function getUiAppearance(): UiAppearance {
  if (typeof window === 'undefined') return { ...DEFAULT_UI_APPEARANCE, theme: getSavedTheme() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const theme = getSavedTheme()
    if (!raw) return { ...DEFAULT_UI_APPEARANCE, theme }
    return { ...DEFAULT_UI_APPEARANCE, theme, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_UI_APPEARANCE, theme: getSavedTheme() }
  }
}

export function saveUiAppearance(patch: Partial<UiAppearance>): UiAppearance {
  const next = { ...getUiAppearance(), ...patch }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sidebarStyle: next.sidebarStyle,
      radiusScale: next.radiusScale,
      customAccent: next.customAccent,
    }))
  }
  return next
}

export function applyUiAppearance(appearance?: Partial<UiAppearance>) {
  const current = getUiAppearance()
  const merged: UiAppearance = { ...current, ...appearance }
  const themeKey = merged.theme
  const base = THEMES[themeKey]
  const accent = merged.customAccent && /^#[0-9a-fA-F]{6}$/.test(merged.customAccent)
    ? merged.customAccent
    : base.accent
  const accentDark = merged.customAccent ? darken(accent, 0.15) : base.dark

  const root = document.documentElement
  const themeVars = getThemeVars(themeKey)
  if (merged.customAccent) {
    themeVars['--accent'] = accent
    themeVars['--accent-dark'] = accentDark
  }
  Object.entries(themeVars).forEach(([k, v]) => root.style.setProperty(k, v))

  const sidebar = sidebarVarsForStyle(merged.sidebarStyle, accent, accentDark)
  Object.entries(sidebar).forEach(([k, v]) => root.style.setProperty(k, v))

  root.style.setProperty('--radius-ui', RADIUS_MAP[merged.radiusScale])
  root.style.setProperty('--hero-from', accent)
  root.style.setProperty('--hero-to', accentDark)
  root.dataset.sidebarStyle = merged.sidebarStyle
  root.dataset.radiusScale = merged.radiusScale

  applyThemeKey(themeKey)
  if (merged.customAccent) {
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-dark', accentDark)
  }
}

export function getAppearanceForInlineScript(): string {
  return JSON.stringify({
    themes: THEMES,
    defaults: DEFAULT_UI_APPEARANCE,
  })
}

export const SIDEBAR_STYLE_LABELS: Record<SidebarStyle, { label: string; desc: string }> = {
  themed: { label: 'Marka Rengi', desc: 'Seçilen tema rengine uyumlu sol panel' },
  dark: { label: 'Koyu Klasik', desc: 'Sabit lacivert gradient (eski görünüm)' },
  light: { label: 'Açık Panel', desc: 'Açık gri sidebar, kurumsal görünüm' },
}

export const RADIUS_LABELS: Record<RadiusScale, string> = {
  sharp: 'Keskin',
  rounded: 'Yuvarlak',
  pill: 'Çok Yuvarlak',
}
