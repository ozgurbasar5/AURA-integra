import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Platform, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { AuraColors } from '@/constants/AuraColors'
import { useAuth } from '@/lib/auth'
import { isMobileTabAllowed, type MobileTab } from '@/lib/role-tabs'

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -1 }} {...props} />
}

/** Alt barda sadece ana operasyon sekmeleri — diğerleri Ana ekrandan */
const PRIMARY_TABS: MobileTab[] = ['index', 'kabul', 'atolye', 'satis', 'kasa']

function href(tab: MobileTab, role?: string | null) {
  if (!PRIMARY_TABS.includes(tab)) return null
  return isMobileTabAllowed(tab, role) ? undefined : null
}

export default function TabLayout() {
  const { profile } = useAuth()
  const role = profile?.role

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AuraColors.primary,
        tabBarInactiveTintColor: AuraColors.muted,
        headerStyle: {
          backgroundColor: AuraColors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: AuraColors.border,
        },
        headerTitleStyle: { fontWeight: '800', color: AuraColors.text, fontSize: 17 },
        tabBarStyle: {
          backgroundColor: AuraColors.card,
          borderTopColor: AuraColors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana',
          href: href('index', role),
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="kabul"
        options={{
          title: 'Kabul',
          href: href('kabul', role),
          tabBarIcon: ({ color }) => <TabIcon name="clipboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="atolye"
        options={{
          title: 'Atölye',
          href: href('atolye', role),
          tabBarIcon: ({ color }) => <TabIcon name="wrench" color={color} />,
        }}
      />
      <Tabs.Screen
        name="satis"
        options={{
          title: 'Satış',
          href: href('satis', role),
          tabBarIcon: ({ color }) => <TabIcon name="shopping-cart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="kasa"
        options={{
          title: 'Kasa',
          href: href('kasa', role),
          tabBarIcon: ({ color }) => <TabIcon name="money" color={color} />,
        }}
      />
      {/* İkincil — alt barda gizli, Ana ekrandan erişilir */}
      <Tabs.Screen name="cari" options={{ href: null, title: 'Cari' }} />
      <Tabs.Screen name="vitrin" options={{ href: null, title: 'Vitrin' }} />
      <Tabs.Screen name="alis" options={{ href: null, title: 'Alış' }} />
      <Tabs.Screen name="sayim" options={{ href: null, title: 'Sayım' }} />
    </Tabs>
  )
}
