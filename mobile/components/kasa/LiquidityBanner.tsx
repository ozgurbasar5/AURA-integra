import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  totalLiquidity: number
}

/**
 * LiquidityBanner — Top-level total liquidity display.
 * Shows ₺ balance in large font. Server-authoritative value only.
 */
export function LiquidityBanner({ totalLiquidity }: Props) {
  const { colors, isDark } = useAppTheme()

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.card : colors.primarySoft,
          borderColor: isDark ? colors.border : colors.primary + '30',
          borderRadius: colors.radiusLg,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.muted }]}>TOPLAM ŞİRKET LİKİDİTESİ</Text>
      <Text
        style={[styles.amount, { color: colors.text }]}
        accessibilityRole="text"
        accessibilityLabel={`Toplam likidite ${totalLiquidity.toLocaleString('tr-TR')} Türk Lirası`}
      >
        ₺{totalLiquidity.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
})
