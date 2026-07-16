import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { apiFetch } from './api'

/** Expo push token kaydı — ana ekranda çağrılır */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null

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
    if (final !== 'granted') return null

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId

    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token = tokenRes.data
    if (!token) return null

    await apiFetch('/api/tenant/device-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    })

    return token
  } catch {
    return null
  }
}
