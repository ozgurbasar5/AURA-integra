export type ColorMode = 'light' | 'dark'

const STORAGE_KEY = 'aura_color_mode'

export function getColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(STORAGE_KEY) as ColorMode | null
  if (saved === 'dark' || saved === 'light') return saved
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function applyColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
  localStorage.setItem(STORAGE_KEY, mode)
}

export function toggleColorMode(): ColorMode {
  const next = getColorMode() === 'dark' ? 'light' : 'dark'
  applyColorMode(next)
  return next
}
