// ─── Theme Definitions ─────────────────────────────────────────────────────────
export const THEMES = {
  indigo:  { name: 'İndigo',      accent: '#6366f1', light: '#eef2ff', dark: '#4f46e5', ring: '#c7d2fe', text: '#4338ca', preview: ['#6366f1','#818cf8','#eef2ff'] },
  blue:    { name: 'Mavi',        accent: '#3b82f6', light: '#eff6ff', dark: '#2563eb', ring: '#bfdbfe', text: '#1d4ed8', preview: ['#3b82f6','#60a5fa','#eff6ff'] },
  cyan:    { name: 'Camgöbeği',   accent: '#06b6d4', light: '#ecfeff', dark: '#0891b2', ring: '#a5f3fc', text: '#0e7490', preview: ['#06b6d4','#22d3ee','#ecfeff'] },
  emerald: { name: 'Zümrüt',      accent: '#10b981', light: '#ecfdf5', dark: '#059669', ring: '#6ee7b7', text: '#047857', preview: ['#10b981','#34d399','#ecfdf5'] },
  teal:    { name: 'Teal',        accent: '#14b8a6', light: '#f0fdfa', dark: '#0d9488', ring: '#99f6e4', text: '#0f766e', preview: ['#14b8a6','#2dd4bf','#f0fdfa'] },
  violet:  { name: 'Viyole',      accent: '#8b5cf6', light: '#f5f3ff', dark: '#7c3aed', ring: '#ddd6fe', text: '#6d28d9', preview: ['#8b5cf6','#a78bfa','#f5f3ff'] },
  rose:    { name: 'Gül',         accent: '#f43f5e', light: '#fff1f2', dark: '#e11d48', ring: '#fecdd3', text: '#be123c', preview: ['#f43f5e','#fb7185','#fff1f2'] },
  orange:  { name: 'Turuncu',     accent: '#f97316', light: '#fff7ed', dark: '#ea580c', ring: '#fed7aa', text: '#c2410c', preview: ['#f97316','#fb923c','#fff7ed'] },
  slate:   { name: 'Antrasit',    accent: '#475569', light: '#f8fafc', dark: '#334155', ring: '#cbd5e1', text: '#1e293b', preview: ['#475569','#64748b','#f8fafc'] },
} as const

export type ThemeKey = keyof typeof THEMES
export type ThemeValue = typeof THEMES[ThemeKey]

export const DEFAULT_THEME: ThemeKey = 'indigo'

export function getThemeVars(key: ThemeKey): Record<string, string> {
  const t = THEMES[key]
  return {
    '--accent':       t.accent,
    '--accent-light': t.light,
    '--accent-dark':  t.dark,
    '--accent-ring':  t.ring,
    '--accent-text':  t.text,
  }
}

export function applyTheme(key: ThemeKey) {
  const vars = getThemeVars(key)
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  localStorage.setItem('aura_theme', key)
}

export function getSavedTheme(): ThemeKey {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const saved = localStorage.getItem('aura_theme') as ThemeKey | null
  return (saved && saved in THEMES) ? saved : DEFAULT_THEME
}
