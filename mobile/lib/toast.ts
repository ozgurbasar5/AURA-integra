export type ToastType = 'info' | 'success' | 'error' | 'warning'

export type ToastMessage = {
  id: string
  message: string
  type: ToastType
}

type Listener = (toast: ToastMessage | null) => void

let listeners: Listener[] = []
let active: ToastMessage | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, type: ToastType = 'info', durationMs = 4000) {
  const toast: ToastMessage = { id: `${Date.now()}`, message, type }
  active = toast
  listeners.forEach(fn => fn(toast))
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    active = null
    listeners.forEach(fn => fn(null))
  }, durationMs)
}

export function hideToast() {
  active = null
  if (hideTimer) clearTimeout(hideTimer)
  listeners.forEach(fn => fn(null))
}

export function subscribeToast(fn: Listener): () => void {
  listeners.push(fn)
  if (active) fn(active)
  return () => {
    listeners = listeners.filter(l => l !== fn)
  }
}
