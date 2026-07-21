/** Profil/tenant hazır değilse sonsuz spinner’ı engelle */

export function profileGateMessage(profile: { tenant_id?: string; is_active?: boolean } | null, authLoading: boolean): string | null {
  if (authLoading) return null
  if (!profile) return 'Profil yüklenemedi — çıkış yapıp tekrar girin'
  if (!profile.tenant_id) return 'Bayi hesabı bağlı değil (tenant yok)'
  if (profile.is_active === false) return 'Hesabınız pasif'
  return null
}
