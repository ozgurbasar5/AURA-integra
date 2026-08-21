import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  onIncome: () => void
  onExpense: () => void
  onTransfer: () => void
  onReconcile: () => void
}

type ActionDef = {
  key: string
  label: string
  icon: React.ComponentProps<typeof FontAwesome>['name']
  colorKey: 'success' | 'danger' | 'primary' | 'warning'
  softKey: 'successSoft' | 'dangerSoft' | 'primarySoft' | 'warningSoft'
}

const ACTIONS: ActionDef[] = [
  { key: 'income', label: '+ Gelir', icon: 'plus-circle', colorKey: 'success', softKey: 'successSoft' },
  { key: 'expense', label: '- Gider', icon: 'minus-circle', colorKey: 'danger', softKey: 'dangerSoft' },
  { key: 'transfer', label: '⇄ Transfer', icon: 'exchange', colorKey: 'primary', softKey: 'primarySoft' },
  { key: 'reconcile', label: '↔ Sayım', icon: 'balance-scale', colorKey: 'warning', softKey: 'warningSoft' },
]

/**
 * QuickActions — 2×2 grid of primary finance actions.
 * Minimum 48px touch target for all buttons.
 */
export function QuickActions({ onIncome, onExpense, onTransfer, onReconcile }: Props) {
  const { colors } = useAppTheme()

  const handlers: Record<string, () => void> = {
    income: onIncome,
    expense: onExpense,
    transfer: onTransfer,
    reconcile: onReconcile,
  }

  return (
    <Animated.View entering={FadeIn.duration(180).delay(100)} style={styles.grid}>
      {ACTIONS.map(action => (
        <Pressable
          key={action.key}
          onPress={handlers[action.key]}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: pressed ? (colors as any)[action.softKey] : colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View style={[styles.iconCircle, { backgroundColor: (colors as any)[action.softKey] }]}>
            <FontAwesome name={action.icon} size={16} color={(colors as any)[action.colorKey]} />
          </View>
          <Text style={[styles.label, { color: colors.text }]}>{action.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  btn: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
})
