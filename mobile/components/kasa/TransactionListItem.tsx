import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

export type TransactionItem = {
  id: string
  type: string
  amount: number
  category?: string
  description?: string
  payment_method?: string
  account_id?: string | null
  target_account_id?: string | null
  transaction_date?: string
  created_at?: string
  customer_name?: string
}

type AccountMap = Record<string, string> // id → name

type Props = {
  item: TransactionItem
  accountNames: AccountMap
}

const TYPE_CONFIG: Record<string, { emoji: string; color: 'success' | 'danger' | 'primary' | 'warning'; sign: string }> = {
  gelir: { emoji: '🟢', color: 'success', sign: '+' },
  gider: { emoji: '🔴', color: 'danger', sign: '-' },
  iade: { emoji: '🟡', color: 'warning', sign: '-' },
  transfer: { emoji: '🔵', color: 'primary', sign: '' },
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * TransactionListItem — Single ledger row optimized for mobile.
 * Shows: time, type emoji, category/description, account name, amount.
 */
export function TransactionListItem({ item, accountNames }: Props) {
  const { colors } = useAppTheme()
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.gelir
  const amountColor = (colors as any)[config.color] || colors.text
  const time = formatTime(item.transaction_date || item.created_at)

  const isTransfer = item.type === 'gider' && item.category === 'Hesap Transferi' && item.target_account_id
  const displayType = isTransfer ? 'transfer' : item.type
  const tc = TYPE_CONFIG[displayType] || config

  const accountLabel = isTransfer
    ? `${accountNames[item.account_id || ''] || '?'} → ${accountNames[item.target_account_id || ''] || '?'}`
    : accountNames[item.account_id || ''] || ''

  const label = item.description || item.category || item.type

  return (
    <View
      style={[styles.row, { borderBottomColor: colors.border }]}
      accessibilityRole="text"
      accessibilityLabel={`${time} ${label} ${tc.sign}${item.amount} lira`}
    >
      {/* Time */}
      <Text style={[styles.time, { color: colors.muted }]}>{time}</Text>

      {/* Emoji + Content */}
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={styles.emoji}>{tc.emoji}</Text>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {isTransfer ? '↔ Transfer' : label}
          </Text>
        </View>
        {accountLabel ? (
          <Text style={[styles.account, { color: colors.muted }]} numberOfLines={1}>
            {accountLabel}
          </Text>
        ) : null}
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: (colors as any)[tc.color] || amountColor }]}>
        {tc.sign}₺{Math.abs(item.amount).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    gap: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 40,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: { fontSize: 14 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  account: {
    fontSize: 12,
    marginLeft: 20,
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 72,
  },
})
