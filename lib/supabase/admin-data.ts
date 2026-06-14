import { getServiceClient } from './service'

/** Admin paneli veri sorguları — service role (RLS bypass) */
export function getAdminDataClient() {
  const client = getServiceClient()
  if (!client) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY eksik. .env.local dosyasına ekleyin ve sunucuyu yeniden başlatın.'
    )
  }
  return client
}
