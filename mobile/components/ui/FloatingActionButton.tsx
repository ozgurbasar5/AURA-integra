import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  icon?: React.ComponentProps<typeof FontAwesome>['name']
  label?: string
  onPress: () => void
  bottomOffset?: number
  tone?: 'primary' | 'success' | 'warning' | 'danger'
  accessibilityLabel?: string
}

export function FloatingActionButton({
  icon = 'plus',
  label,
  onPress,
  bottomOffset = 80,
  tone = 'primary',
  accessibilityLabel = 'Hızlı Eylem',
}: Props) {
  const { colors, isDark } = useAppTheme()
  const insets = useSafeAreaInsets()

  const bg =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'warning'
          ? colors.warning
          : colors.primary

  const bottom = Math.max(insets.bottom, 16) + bottomOffset

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        label ? styles.extended : styles.circle,
        {
          backgroundColor: bg,
          bottom,
          shadowColor: isDark ? '#000' : bg,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <FontAwesome name={icon} size={20} color="#fff" />
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  extended: {
    flexDirection: 'row',
    gap: 8,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 27,
  },
  labelText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
})
