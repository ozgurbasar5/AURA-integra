import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuraColors } from '@/constants/AuraColors'

const STORAGE_KEY = 'aura_mobile_appearance'

/** Web `lib/theme.ts` ile aynı paletler */
export const THEMES = {
  sky: { name: 'Gökyüzü', accent: '#0284c7', light: '#e0f2fe', dark: '#0c4a6e' },
  indigo: { name: 'İndigo', accent: '#6366f1', light: '#eef2ff', dark: '#4f46e5' },
  blue: { name: 'Mavi', accent: '#3b82f6', light: '#eff6ff', dark: '#2563eb' },
  cyan: { name: 'Camgöbeği', accent: '#06b6d4', light: '#ecfeff', dark: '#0891b2' },
  emerald: { name: 'Zümrüt', accent: '#10b981', light: '#ecfdf5', dark: '#059669' },
  teal: { name: 'Teal', accent: '#14b8a6', light: '#f0fdfa', dark: '#0d9488' },
  violet: { name: 'Viyole', accent: '#8b5cf6', light: '#f5f3ff', dark: '#7c3aed' },
  rose: { name: 'Gül', accent: '#f43f5e', light: '#fff1f2', dark: '#e11d48' },
  orange: { name: 'Turuncu', accent: '#f97316', light: '#fff7ed', dark: '#ea580c' },
  slate: { name: 'Antrasit', accent: '#475569', light: '#f8fafc', dark: '#334155' },
} as const

export type ThemeKey = keyof typeof THEMES
export type RadiusScale = 'sharp' | 'rounded' | 'pill'
export type Density = 'compact' | 'comfortable'
export type TabBarStyle = 'dock' | 'floating'
export type ColorMode = 'system' | 'light' | 'dark'

export type MobileAppearance = {
  theme: ThemeKey
  customAccent: string | null
  radiusScale: RadiusScale
  density: Density
  tabBarStyle: TabBarStyle
  homeColumns: 2 | 3
  colorMode: ColorMode
}

export const DEFAULT_APPEARANCE: MobileAppearance = {
  theme: 'sky',
  customAccent: null,
  radiusScale: 'rounded',
  density: 'comfortable',
  tabBarStyle: 'dock',
  homeColumns: 2,
  colorMode: 'system',
}

export type ThemeColors = typeof AuraColors & {
  radius: number
  radiusSm: number
  radiusLg: number
  space: number
  spaceSm: number
}

function isHex(v: string | null | undefined): v is string {
  return !!v && /^#[0-9a-fA-F]{6}$/.test(v)
}

export function radiusFor(scale: RadiusScale): { radius: number; radiusSm: number; radiusLg: number } {
  if (scale === 'sharp') return { radius: 8, radiusSm: 6, radiusLg: 12 }
  if (scale === 'pill') return { radius: 22, radiusSm: 16, radiusLg: 28 }
  return { radius: 14, radiusSm: 10, radiusLg: 18 }
}

export function densityFor(d: Density): { space: number; spaceSm: number } {
  return d === 'compact' ? { space: 10, spaceSm: 6 } : { space: 14, spaceSm: 8 }
}

export function resolveColors(appearance: MobileAppearance, dark = false): ThemeColors {
  const base = THEMES[appearance.theme] ?? THEMES.sky
  const accent = isHex(appearance.customAccent) ? appearance.customAccent : base.accent
  const primaryDark = isHex(appearance.customAccent) ? darken(accent, 0.35) : base.dark
  const primarySoft = isHex(appearance.customAccent) ? lighten(accent, 0.85) : base.light
  const r = radiusFor(appearance.radiusScale)
  const s = densityFor(appearance.density)

  if (dark) {
    return {
      primary: accent,
      primaryDark: lighten(accent, 0.15),
      primarySoft: 'rgba(255,255,255,0.08)',
      accent,
      bg: '#0f172a',
      bgElevated: '#1e293b',
      card: '#1e293b',
      text: '#f8fafc',
      muted: '#94a3b8',
      border: '#334155',
      danger: '#f87171',
      dangerSoft: 'rgba(248,113,113,0.15)',
      success: '#34d399',
      successSoft: 'rgba(52,211,153,0.15)',
      warning: '#fbbf24',
      warningSoft: 'rgba(251,191,36,0.15)',
      ...r,
      ...s,
    }
  }

  return {
    ...AuraColors,
    primary: accent,
    primaryDark,
    primarySoft,
    accent,
    ...r,
    ...s,
  }
}

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const r = Math.max(0, Math.round(parseInt(n.slice(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(n.slice(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(n.slice(4, 6), 16) * (1 - amount)))
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function lighten(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const r = Math.min(255, Math.round(parseInt(n.slice(0, 2), 16) + (255 - parseInt(n.slice(0, 2), 16)) * amount))
  const g = Math.min(255, Math.round(parseInt(n.slice(2, 4), 16) + (255 - parseInt(n.slice(2, 4), 16)) * amount))
  const b = Math.min(255, Math.round(parseInt(n.slice(4, 6), 16) + (255 - parseInt(n.slice(4, 6), 16)) * amount))
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

export async function loadAppearance(): Promise<MobileAppearance> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    const parsed = JSON.parse(raw) as Partial<MobileAppearance>
    return { ...DEFAULT_APPEARANCE, ...parsed }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export async function saveAppearance(next: MobileAppearance): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
