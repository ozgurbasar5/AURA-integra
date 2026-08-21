import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useAppTheme } from '@/lib/ThemeContext'

export type AccountItem = {
  id: string
  name: string
  type: string
  balance: number
  is_default: boolean
}

type Props = {
  accounts: AccountItem[]
  onSelectAccount: (account: AccountItem) => void
  onQuickIncome: (account: AccountItem) => void
  onQuickExpense: (account: AccountItem) => void
}

const TYPE_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  kasa: 'money',
  nakit: 'money',
  pos: 'credit-card',
  banka: 'university',
  diger: 'ellipsis-h',
}

/**
 * AccountCardStrip — Horizontal scroll of account cards.
 * Each card: name, balance, type icon, quick income/expense.
 * Card tap → filter ledger by that account.
 */
export function AccountCardStrip({ accounts, onSelectAccount, onQuickIncome, onQuickExpense }: Props) {
  const { colors, isDark } = useAppTheme()

  if (!accounts.length) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {accounts.map((acc, i) => (
        <Animated.View key={acc.id} entering={FadeIn.duration(180).delay(i * 60)}>
          <Pressable
            onPress={() => onSelectAccount(acc)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radiusLg,
                opacity: pressed ? 0.92 : 1,
                shadowColor: isDark ? '#000' : '#64748b',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${acc.name} hesabı, bakiye ${acc.balance.toLocaleString('tr-TR')} lira`}
          >
            {/* Header: icon + name */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                <FontAwesome
                  name={TYPE_ICONS[acc.type] || 'ellipsis-h'}
                  size={14}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                {acc.name}
              </Text>
            </View>

            {/* Balance */}
            <Text style={[styles.cardBalance, { color: colors.text }]}>
              ₺{acc.balance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>

            {/* Quick actions */}
            <View style={styles.cardActions}>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onQuickIncome(acc) }}
                style={[styles.quickBtn, { backgroundColor: colors.successSoft, borderRadius: colors.radiusSm }]}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${acc.name} gelir ekle`}
              >
                <Text style={[styles.quickBtnText, { color: colors.success }]}>+ Gelir</Text>
              </Pressable>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onQuickExpense(acc) }}
                style={[styles.quickBtn, { backgroundColor: colors.dangerSoft, borderRadius: colors.radiusSm }]}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${acc.name} gider ekle`}
              >
                <Text style={[styles.quickBtnText, { color: colors.danger }]}>- Gider</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 16, gap: 10 },
  card: {
    width: 170,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  cardBalance: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
})
