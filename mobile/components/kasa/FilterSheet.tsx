import React from 'react'
import { Text, View, StyleSheet } from 'react-native'
import { FormModal } from '@/components/ui/FormModal'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { useAppTheme } from '@/lib/ThemeContext'
import type { AccountItem } from './AccountCardStrip'

type Props = {
  visible: boolean
  accounts: AccountItem[]
  accountFilter: string
  typeFilter: string
  onAccountChange: (id: string) => void
  onTypeChange: (type: string) => void
  onClear: () => void
  onClose: () => void
}

const TX_TYPES = [
  { value: '', label: 'Tümü' },
  { value: 'gelir', label: 'Gelir' },
  { value: 'gider', label: 'Gider' },
  { value: 'iade', label: 'İade' },
]

/**
 * FilterSheet — Bottom sheet filter for transactions.
 * Account, Type filters with chip selection.
 * One-handed usable.
 */
export function FilterSheet({
  visible,
  accounts,
  accountFilter,
  typeFilter,
  onAccountChange,
  onTypeChange,
  onClear,
  onClose,
}: Props) {
  const { colors } = useAppTheme()

  const hasFilters = accountFilter !== '' || typeFilter !== ''

  return (
    <FormModal
      visible={visible}
      title="Filtreler"
      onClose={onClose}
      footer={
        <View style={styles.footerRow}>
          {hasFilters ? (
            <Button
              title="Filtreleri Temizle"
              variant="secondary"
              onPress={() => { onClear(); onClose() }}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button title="Uygula" onPress={onClose} style={{ flex: 1 }} />
        </View>
      }
    >
      {/* Account filter */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Hesap</Text>
      <View style={styles.chipRow}>
        <Chip label="Tümü" active={accountFilter === ''} onPress={() => onAccountChange('')} />
        {accounts.map(acc => (
          <Chip
            key={acc.id}
            label={acc.name}
            active={accountFilter === acc.id}
            onPress={() => onAccountChange(acc.id)}
          />
        ))}
      </View>

      {/* Type filter */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>İşlem Tipi</Text>
      <View style={styles.chipRow}>
        {TX_TYPES.map(t => (
          <Chip
            key={t.value}
            label={t.label}
            active={typeFilter === t.value}
            onPress={() => onTypeChange(t.value)}
          />
        ))}
      </View>
    </FormModal>
  )
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  footerRow: { flexDirection: 'row', gap: 8 },
})
