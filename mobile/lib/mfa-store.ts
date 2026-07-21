import AsyncStorage from '@react-native-async-storage/async-storage'

const MFA_USER_KEY = 'aura_mfa_verified_user'

export async function getMfaVerifiedUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(MFA_USER_KEY)
  } catch {
    return null
  }
}

export async function setMfaVerifiedUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(MFA_USER_KEY, userId)
}

export async function clearMfaVerifiedUserId(): Promise<void> {
  await AsyncStorage.removeItem(MFA_USER_KEY)
}
