import { captureException } from '@/lib/sentry'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function logWebhookFailure(
  admin: SupabaseClient,
  opts: {
    provider: string
    eventType?: string
    externalRef?: string
    tenantId?: string | null
    errorMessage: string
    payload?: Record<string, unknown>
  },
): Promise<void> {
  await captureException(new Error(opts.errorMessage), opts)
  try {
    await admin.from('webhook_failures').insert({
      provider: opts.provider,
      event_type: opts.eventType ?? null,
      external_ref: opts.externalRef ?? null,
      tenant_id: opts.tenantId ?? null,
      error_message: opts.errorMessage,
      payload: opts.payload ?? {},
    })
  } catch {
    /* table may not exist yet */
  }
}
