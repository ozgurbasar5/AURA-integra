import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { hideToast, subscribeToast, type ToastMessage, type ToastType } from '@/lib/toast'
import { useAppTheme } from '@/lib/ThemeContext'

const ICON: Record<ToastType, React.ComponentProps<typeof FontAwesome>['name']> = {
  info: 'info-circle',
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
}

const BG: Record<ToastType, string> = {
  info: '#0284c7',
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
}

export function ToastBanner() {
  const insets = useSafeAreaInsets()
  const { colors } = useAppTheme()
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => subscribeToast(setToast), [])

  if (!toast) return null

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8 }]}
    >
      <Pressable
        style={[styles.banner, { backgroundColor: BG[toast.type], borderRadius: colors.radiusLg }]}
        onPress={hideToast}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
      >
        <FontAwesome name={ICON[toast.type]} size={16} color="#fff" />
        <Text style={styles.text}>{toast.message}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
})
