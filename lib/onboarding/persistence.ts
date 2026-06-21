/** Kullanıcı bazlı onboarding durumu — DB + localStorage yedek */

export function onboardingStorageKey(userId: string) {
  return `aura_onboarding_done_${userId}`
}

export function setupWizardStorageKey(userId: string) {
  return `aura_setup_wizard_done_${userId}`
}

export function readLocalOnboardingDone(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return false
  return localStorage.getItem(onboardingStorageKey(userId)) === '1'
}

export function writeLocalOnboardingDone(userId: string) {
  if (typeof window === 'undefined' || !userId) return
  localStorage.setItem(onboardingStorageKey(userId), '1')
}

export function readLocalSetupWizardDone(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return false
  return localStorage.getItem(setupWizardStorageKey(userId)) === '1'
}

export function writeLocalSetupWizardDone(userId: string) {
  if (typeof window === 'undefined' || !userId) return
  localStorage.setItem(setupWizardStorageKey(userId), '1')
}

export async function patchOnboardingFlags(
  flags: { onboarding_completed?: boolean; setup_wizard_completed?: boolean },
): Promise<boolean> {
  try {
    const res = await fetch('/api/tenant/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flags),
    })
    return res.ok
  } catch {
    return false
  }
}
