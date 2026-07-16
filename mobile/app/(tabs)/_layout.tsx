import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Tabs } from 'expo-router'
import { AuraColors } from '@/constants/AuraColors'
import { useAuth } from '@/lib/auth'
import { isMobileTabAllowed, type MobileTab } from '@/lib/role-tabs'

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />
}

function href(tab: MobileTab, role?: string | null) {
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
        headerStyle: { backgroundColor: AuraColors.card },
        headerTitleStyle: { fontWeight: '800', color: AuraColors.text },
        tabBarStyle: {
          backgroundColor: AuraColors.card,
          borderTopColor: AuraColors.border,
          minHeight: 56,
        },
        tabBarLabelStyle: { fontSize: 10 },
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
        name="cari"
        options={{
          title: 'Cari',
          href: href('cari', role),
          tabBarIcon: ({ color }) => <TabIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vitrin"
        options={{
          title: 'Vitrin',
          href: href('vitrin', role),
          tabBarIcon: ({ color }) => <TabIcon name="mobile" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alis"
        options={{
          title: 'Alış',
          href: href('alis', role),
          tabBarIcon: ({ color }) => <TabIcon name="truck" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sayim"
        options={{
          title: 'Sayım',
          href: href('sayim', role),
          tabBarIcon: ({ color }) => <TabIcon name="barcode" color={color} />,
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
    </Tabs>
  )
}
