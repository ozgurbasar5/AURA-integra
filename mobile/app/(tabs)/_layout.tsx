import React from 'react'
import { Tabs } from 'expo-router'
import { BrandHeader } from '@/components/BrandHeader'
import { AppTabBar } from '@/components/AppTabBar'
import { useAuth } from '@/lib/auth'
import { isMobileTabAllowed, type MobileTab } from '@/lib/role-tabs'
import { useAppTheme } from '@/lib/ThemeContext'

/** Alt barda sadece ana operasyon sekmeleri — diğerleri Ana ekrandan */
const PRIMARY_TABS: MobileTab[] = ['index', 'kabul', 'atolye', 'satis', 'kasa']

const TITLES: Record<string, string> = {
  index: 'Ana',
  kabul: 'Kabul',
  atolye: 'Atölye',
  satis: 'Satış',
  kasa: 'Kasa',
  cari: 'Cari',
  vitrin: 'Vitrin',
  alis: 'Alış',
  sayim: 'Sayım',
  stok: 'Stok',
  tedarik: 'Tedarik',
  musteriler: 'Müşteriler',
  randevu: 'Randevu',
  garanti: 'Garanti',
  finans: 'Finans',
  raporlar: 'Raporlar',
  komisyon: 'Komisyon',
  bildirimler: 'Bildirimler',
  ayarlar: 'Ayarlar',
}

function href(tab: MobileTab, role?: string | null) {
  if (!PRIMARY_TABS.includes(tab)) return null
  return isMobileTabAllowed(tab, role) ? undefined : null
}

export default function TabLayout() {
  const { profile } = useAuth()
  const role = profile?.role
  const { colors } = useAppTheme()

  return (
    <Tabs
      tabBar={props => <AppTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: () => <BrandHeader title={TITLES[route.name]} />,
        sceneStyle: { backgroundColor: colors.bg },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana', href: href('index', role) }} />
      <Tabs.Screen name="kabul" options={{ title: 'Kabul', href: href('kabul', role) }} />
      <Tabs.Screen name="atolye" options={{ title: 'Atölye', href: href('atolye', role) }} />
      <Tabs.Screen name="satis" options={{ title: 'Satış', href: href('satis', role) }} />
      <Tabs.Screen name="kasa" options={{ title: 'Kasa', href: href('kasa', role) }} />
      <Tabs.Screen name="cari" options={{ href: null, title: 'Cari' }} />
      <Tabs.Screen name="vitrin" options={{ href: null, title: 'Vitrin' }} />
      <Tabs.Screen name="alis" options={{ href: null, title: 'Alış' }} />
      <Tabs.Screen name="sayim" options={{ href: null, title: 'Sayım' }} />
      <Tabs.Screen name="stok" options={{ href: null, title: 'Stok' }} />
      <Tabs.Screen name="tedarik" options={{ href: null, title: 'Tedarik' }} />
      <Tabs.Screen name="musteriler" options={{ href: null, title: 'Müşteriler' }} />
      <Tabs.Screen name="randevu" options={{ href: null, title: 'Randevu' }} />
      <Tabs.Screen name="garanti" options={{ href: null, title: 'Garanti' }} />
      <Tabs.Screen name="finans" options={{ href: null, title: 'Finans' }} />
      <Tabs.Screen name="raporlar" options={{ href: null, title: 'Raporlar' }} />
      <Tabs.Screen name="komisyon" options={{ href: null, title: 'Komisyon' }} />
      <Tabs.Screen name="bildirimler" options={{ href: null, title: 'Bildirimler' }} />
      <Tabs.Screen name="ayarlar" options={{ href: null, title: 'Ayarlar' }} />
    </Tabs>
  )
}
