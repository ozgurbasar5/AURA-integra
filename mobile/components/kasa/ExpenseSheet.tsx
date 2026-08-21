import React, { useState, useEffect, useCallback } from 'react'
import { Text, View, StyleSheet } from 'react-native'
import { FormModal } from '@/components/ui/FormModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Chip } from '@/components/ui/Chip'
import { useAppTheme } from '@/lib/ThemeContext'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { parseLocaleNumber } from '@/lib/parse-locale-number'
import type { AccountItem } from './AccountCardStrip'

const EXPENSE_CATEGORIES = [
  'Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet/Telefon',
  'Personel Maaş', 'SGK Primi', 'Tedarikçi Ödemesi', 'Sarf Malzeme',
  'Kargo/Kurye', 'Muhasebe', 'Vergi', 'Sigorta', 'Reklam/Pazarlama',
  'Bakım/Onarım', 'Demirbaş', 'Diğer Gider',
]

type Props = {
  visible: boolean
  accounts: AccountItem[]
  preselectedAccount?: AccountItem | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * ExpenseSheet — Bottom sheet for recording expenses.
 * Validates amount > 0 strictly (no negative/zero).
 * Submits to POST /api/tenant/transactions.
 * No optimistic balance update — refetch on success.
 */
export function ExpenseSheet({ visible, accounts, preselectedAccount, onClose, onSuccess }: Props) {
  const { colors } = useAppTheme()
  const [busy, setBusy] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      const def = preselectedAccount || accounts.find(a => a.is_default) || accounts[0]
      setAccountId(def?.id || '')
      setAmountStr('')
      setCategory(EXPENSE_CATEGORIES[0])
      setDescription('')
      setError('')
    }
  }, [visible, preselectedAccount, accounts])

  const paymentMethod = useCallback(() => {
    const acc = accounts.find(a => a.id === accountId)
    if (acc?.type === 'pos') return 'kredi_karti'
    if (acc?.type === 'banka') return 'havale'
    return 'nakit'
  }, [accountId, accounts])

  const handleSubmit = async () => {
    const amount = parseLocaleNumber(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Tutar sıfırdan büyük olmalıdır')
      return
    }
    if (!description.trim()) {
      setError('Açıklama gerekli')
      return
    }
    if (!accountId) {
      setError('Hesap seçin')
      return
    }

    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'gider',
          amount,
          category,
          description: description.trim(),
          payment_method: paymentMethod(),
          account_id: accountId,
          transaction_date: new Date().toISOString(),
        }),
      })
      invalidateApiCache('/api/tenant/accounts')
      invalidateApiCache('/api/tenant/transactions')
      showToast(`Gider kaydedildi: ₺${amount.toLocaleString('tr-TR')}`, 'success')
      onSuccess()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gider kaydedilemedi'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      title="- Gider Kaydı"
      onClose={onClose}
      footer={<Button title="Gideri Kaydet" variant="danger" loading={busy} onPress={() => void handleSubmit()} />}
    >
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {/* Account */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Hesap</Text>
      <View style={styles.chipRow}>
        {accounts.map(acc => (
          <Chip
            key={acc.id}
            label={`${acc.name} (₺${acc.balance.toLocaleString('tr-TR')})`}
            active={acc.id === accountId}
            onPress={() => setAccountId(acc.id)}
          />
        ))}
      </View>

      {/* Amount */}
      <TextField
        label="Tutar (₺)"
        keyboardType="decimal-pad"
        value={amountStr}
        onChangeText={setAmountStr}
        placeholder="0,00"
      />

      {/* Category */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Kategori</Text>
      <View style={styles.chipRow}>
        {EXPENSE_CATEGORIES.map(cat => (
          <Chip
            key={cat}
            label={cat}
            active={cat === category}
            tone="danger"
            onPress={() => setCategory(cat)}
          />
        ))}
      </View>

      {/* Description */}
      <TextField
        label="Açıklama"
        value={description}
        onChangeText={setDescription}
        placeholder="Ör: Kargo masrafı"
      />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  error: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
})
