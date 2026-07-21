import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { apiFetch } from './api'

export type PushRegisterResult =
  | { ok: true; token: string; permission: 'granted' }
  | { ok: false; permission: 'denied' | 'undetermined' | 'unknown' | 'granted'; message: string }

/** Expo push token kaydı */
export async function registerForPushNotifications(): Promise<PushRegisterResult> {
  if (!Device.isDevice) {
    return { ok: false, permission: 'unknown', message: 'Simülatörde push desteklenmiyor' }
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  const { status: existing } = await Notifications.getPermissionsAsync()
  let final = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    final = status
  }
  if (final !== 'granted') {
    return {
      ok: false,
      permission: final === 'denied' ? 'denied' : 'undetermined',
      message: 'Bildirim izni verilmedi — ayarlardan açabilirsiniz',
    }
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId

    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token = tokenRes.data
    if (!token) {
      return { ok: false, permission: 'granted', message: 'Push token alınamadı' }
    }

    await apiFetch('/api/tenant/device-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    })

    return { ok: true, token, permission: 'granted' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Push kaydı başarısız'
    return { ok: false, permission: 'granted', message }
  }
}

export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync()
  if (status === 'granted') return 'granted'
  if (status === 'denied') return 'denied'
  return 'undetermined'
}

/** Bildirime tıklanınca yönlendirme verisi */
export function getNotificationRoute(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null
  const orderId = data.order_id ?? data.orderId ?? data.service_order_id
  if (typeof orderId === 'string' && orderId) return `/atolye/${orderId}`
  if (data.screen === 'kabul') return '/kabul'
  if (data.screen === 'atolye') return '/atolye'
  return null
}
