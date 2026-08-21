import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  isConnected: boolean
  isSaving?: boolean
  onRetry?: () => void
}

/**
 * NetworkBanner — Shows network/save status.
 * "Kaydediliyor...", "Bağlantı kesildi", "Tekrar dene"
 */
export function NetworkBanner({ isConnected, isSaving, onRetry }: Props) {
  const { colors } = useAppTheme()

  if (isConnected && !isSaving) return null

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      style={[
        styles.banner,
        {
          backgroundColor: isSaving ? colors.warningSoft : colors.dangerSoft,
          borderColor: isSaving ? colors.warning : colors.danger,
          borderRadius: colors.radius,
        },
      ]}
    >
      <FontAwesome
        name={isSaving ? 'cloud-upload' : 'wifi'}
        size={14}
        color={isSaving ? colors.warning : colors.danger}
      />
      <Text style={[styles.text, { color: isSaving ? colors.warning : colors.danger }]}>
        {isSaving ? 'Kaydediliyor…' : 'Bağlantı kesildi'}
      </Text>
      {!isConnected && onRetry ? (
        <Text
          onPress={onRetry}
          style={[styles.retry, { color: colors.primary }]}
          accessibilityRole="button"
        >
          Tekrar dene
        </Text>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  retry: {
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
})
