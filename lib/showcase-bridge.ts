/** Vitrin — API ↔ localStorage cache */

import {
  getSecondHandDevices,
  replaceSecondHandDevices,
  upsertSecondHandDevice,
  type SecondHandDevice,
} from './store'

export async function loadShowcaseFromApi(): Promise<SecondHandDevice[]> {
  try {
    const res = await fetch('/api/tenant/showcase', { credentials: 'same-origin' })
    if (!res.ok) return getSecondHandDevices()
    const json = await res.json() as { items?: SecondHandDevice[] }
    const items = json.items ?? []
    replaceSecondHandDevices(items, { silent: true })
    return items
  } catch {
    return getSecondHandDevices()
  }
}

export async function createShowcaseViaApi(
  data: Omit<SecondHandDevice, 'id' | 'created_at' | 'status' | 'barcode'> & { barcode?: string },
): Promise<SecondHandDevice> {
  const res = await fetch('/api/tenant/showcase', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json() as { error?: string; item?: SecondHandDevice }
  if (!res.ok || !json.item) throw new Error(json.error || 'Vitrin cihazı eklenemedi')
  upsertSecondHandDevice(json.item, { silent: true })
  return json.item
}

export async function updateShowcaseViaApi(
  id: string,
  patch: Partial<SecondHandDevice>,
): Promise<SecondHandDevice> {
  const res = await fetch('/api/tenant/showcase', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  })
  const json = await res.json() as { error?: string; item?: SecondHandDevice }
  if (!res.ok || !json.item) throw new Error(json.error || 'Güncellenemedi')
  upsertSecondHandDevice(json.item, { silent: true })
  return json.item
}
