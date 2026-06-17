/**
 * Sentry entegrasyonu — DSN yoksa no-op
 */
export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error('[error]', err, context ?? {})
    return
  }
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err, { extra: context })
  } catch {
    console.error('[sentry-fallback]', err, context ?? {})
  }
}

export async function captureMessage(message: string, context?: Record<string, unknown>): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureMessage(message, { extra: context })
  } catch {
    console.warn('[sentry-fallback]', message, context ?? {})
  }
}
