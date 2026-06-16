import { getServiceClient } from '@/lib/supabase/service'
import { decryptSecret } from '@/lib/secrets-crypto'

export type TenantSmsCredentials = {
  usercode: string
  password: string
  header: string
}

export async function getTenantSmsCredentials(tenantId: string): Promise<TenantSmsCredentials | null> {
  const admin = getServiceClient()
  if (!admin) return null

  const { data } = await admin
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const notif = (data?.settings as Record<string, unknown>)?.notification_config as Record<string, string> | undefined
  if (!notif?.netgsm_user || !notif?.netgsm_pass) return null

  return {
    usercode: notif.netgsm_user,
    password: decryptSecret(notif.netgsm_pass),
    header: notif.netgsm_header ?? 'AURA',
  }
}

export async function logSmsToDb(input: {
  tenantId: string
  recipient: string
  message: string
  status: string
  providerRef?: string
  errorMessage?: string
  orderNo?: string
  customerName?: string
}) {
  const admin = getServiceClient()
  if (!admin) return

  await admin.from('sms_logs').insert({
    tenant_id: input.tenantId,
    recipient: input.recipient,
    message: input.message.slice(0, 500),
    provider: 'netgsm',
    status: input.status,
    provider_ref: input.providerRef ?? null,
    error_message: input.errorMessage ?? null,
    order_no: input.orderNo ?? null,
    customer_name: input.customerName ?? null,
  })
}
