/**
 * Firma markası — servis formu, WhatsApp ve SMS şablonları
 */

import { getNotificationSettings, setNotificationSettings, type NotificationSettings } from './store'

export interface BusinessBranding {
  shopName: string
  shopPhone: string
  shopAddress: string
  shopLogo: string | null
}

export function getBusinessBranding(): BusinessBranding {
  const s = getNotificationSettings()
  return {
    shopName: s.shop_name?.trim() || 'AURA İntegra',
    shopPhone: s.shop_phone?.trim() || '',
    shopAddress: s.shop_address?.trim() || '',
    shopLogo: s.shop_logo?.trim() || null,
  }
}

export type BusinessBrandingInput = Pick<
  NotificationSettings,
  'shop_name' | 'shop_logo' | 'shop_address' | 'shop_phone' | 'portal_slug'
>

export function getPortalSlug(): string {
  return getNotificationSettings().portal_slug?.trim() || ''
}

export function saveBusinessBranding(data: Partial<BusinessBrandingInput>): NotificationSettings {
  return setNotificationSettings(data)
}

/** Supabase tenants tablosuna marka bilgisi yaz */
export async function syncBusinessBrandingToSupabase(
  data: Partial<BusinessBrandingInput>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/tenant/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_name: data.shop_name,
        shop_phone: data.shop_phone,
        shop_address: data.shop_address,
        shop_logo: data.shop_logo,
        portal_slug: data.portal_slug,
        company_name: data.shop_name,
      }),
    })
    const json = await res.json()
    if (!res.ok) return { ok: false, error: json.error || 'Senkronizasyon başarısız' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Ağ hatası — yerel kayıt yapıldı, sunucu senkronu atlandı' }
  }
}

/** Supabase'den marka çek (ayarlar açılışında) */
export async function fetchBusinessBrandingFromSupabase(): Promise<Partial<BusinessBrandingInput> | null> {
  try {
    const res = await fetch('/api/tenant/branding')
    if (!res.ok) return null
    const json = await res.json()
    return {
      shop_name: json.shopName,
      shop_phone: json.shopPhone,
      shop_address: json.shopAddress,
      shop_logo: json.shopLogo || '',
      portal_slug: json.portalSlug || '',
    }
  } catch {
    return null
  }
}

/** Logo yükleme — max ~400KB base64 */
export function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Sadece görsel dosyası yükleyebilirsiniz'))
      return
    }
    if (file.size > 400_000) {
      reject(new Error('Logo en fazla 400 KB olabilir'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}
