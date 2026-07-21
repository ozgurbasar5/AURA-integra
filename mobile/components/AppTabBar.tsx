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
  const { colors, appearance } = useAppTheme()
  const insets = useSafeAreaInsets()
  const floating = appearance.tabBarStyle === 'floating'
  const bottomPad = Math.max(insets.bottom, floating ? 8 : 4)

  const visible = state.routes.filter(route => {
    const opts = descriptors[route.key]?.options
    // expo-router hides with href: null → tabBarButton null / href
    const href = (opts as { href?: string | null }).href
    if (href === null) return false
    return LABELS[route.name] != null
  })

  return (
    <View
      pointerEvents="box-none"
      style={[
        floating ? styles.outerFloat : styles.outerDock,
        floating && { paddingHorizontal: 12, paddingBottom: bottomPad },
        !floating && { paddingBottom: bottomPad },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            height: 56,
            borderRadius: floating ? colors.radiusLg : 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderWidth: floating ? StyleSheet.hairlineWidth : 0,
            shadowOpacity: floating ? 0.12 : 0.04,
            elevation: floating ? 8 : 2,
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
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primarySoft,
                    borderRadius: 10,
                  },
                ]}
              >
                <FontAwesome
                  name={icon}
                  size={20}
                  color={focused ? colors.primary : colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.primary : colors.muted },
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
  outerDock: {
    backgroundColor: 'transparent',
  },
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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  iconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
})
