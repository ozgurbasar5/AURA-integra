import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useAppTheme } from '@/lib/ThemeContext'

const ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  index: 'home',
  kabul: 'clipboard',
  atolye: 'wrench',
  satis: 'shopping-cart',
  kasa: 'money',
}

const LABELS: Record<string, string> = {
  index: 'Ana',
  kabul: 'Kabul',
  atolye: 'Atölye',
  satis: 'Satış',
  kasa: 'Kasa',
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, appearance, isDark } = useAppTheme()
  const insets = useSafeAreaInsets()
  const floating = appearance.tabBarStyle === 'floating' || true
  const bottomPad = Math.max(insets.bottom, 12)

  const visible = state.routes.filter(route => {
    const opts = descriptors[route.key]?.options
    const href = (opts as { href?: string | null }).href
    if (href === null) return false
    return LABELS[route.name] != null
  })

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerFloat,
        { paddingHorizontal: 16, paddingBottom: bottomPad },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            height: 62,
            borderRadius: colors.radiusLg || 24,
            borderWidth: 1,
            shadowColor: isDark ? '#000000' : '#0284c7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.35 : 0.1,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        {visible.map(route => {
          const index = state.routes.findIndex(r => r.key === route.key)
          const focused = state.index === index
          const icon = ICONS[route.name] || 'circle'
          const label = LABELS[route.name] || route.name

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${label} sekmesi`}
              accessibilityState={focused ? { selected: true } : {}}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primarySoft,
                    borderRadius: 16,
                  },
                ]}
              >
                <FontAwesome
                  name={icon}
                  size={19}
                  color={focused ? colors.primary : colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? colors.primary : colors.muted,
                    fontWeight: focused ? '800' : '600',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outerFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
})

