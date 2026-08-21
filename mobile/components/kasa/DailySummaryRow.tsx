import React from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { StatPill } from '@/components/ui/States'

type Props = {
  income: number
  expense: number
  net: number
}

/**
 * DailySummaryRow — Horizontal row of today's financial summary pills.
 * All values are server-authoritative (from daily-eod API).
 */
export function DailySummaryRow({ income, expense, net }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(180).delay(140)} style={styles.row}>
      <StatPill
        label="Bugün Gelir"
        value={`₺${Math.round(income).toLocaleString('tr-TR')}`}
        tone="success"
        icon="arrow-up"
      />
      <StatPill
        label="Bugün Gider"
        value={`₺${Math.round(expense).toLocaleString('tr-TR')}`}
        tone="danger"
        icon="arrow-down"
      />
      <StatPill
        label="Net"
        value={`₺${Math.round(net).toLocaleString('tr-TR')}`}
        tone={net >= 0 ? 'success' : 'danger'}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
})
