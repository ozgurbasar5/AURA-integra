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

const INCOME_CATEGORIES = [
  'Servis Ücreti', 'Yedek Parça Satışı', 'Aksesuar Satışı',
  'Cihaz Satışı', '2. El Satış', 'Yazılım Hizmeti', 'Garanti Dışı Tamir',
  'Kurumsal Anlaşma', 'Diğer Gelir',
]

type Props = {
  visible: boolean
  accounts: AccountItem[]
  preselectedAccount?: AccountItem | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * IncomeSheet — Bottom sheet for recording income.
 * Uses FormModal (keyboard-safe, safe-area aware).
 * Submits to POST /api/tenant/transactions.
 * No optimistic balance update — refetch on success.
 */
export function IncomeSheet({ visible, accounts, preselectedAccount, onClose, onSuccess }: Props) {
  const { colors } = useAppTheme()
  const [busy, setBusy] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [category, setCategory] = useState(INCOME_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      const def = preselectedAccount || accounts.find(a => a.is_default) || accounts[0]
      setAccountId(def?.id || '')
      setAmountStr('')
      setCategory(INCOME_CATEGORIES[0])
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
      setError('Geçerli bir tutar girin')
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
          type: 'gelir',
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
      showToast(`Gelir kaydedildi: ₺${amount.toLocaleString('tr-TR')}`, 'success')
      onSuccess()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gelir kaydedilemedi'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const selectedAccount = accounts.find(a => a.id === accountId)

  return (
    <FormModal
      visible={visible}
      title="+ Gelir Kaydı"
      onClose={onClose}
      footer={<Button title="Geliri Kaydet" loading={busy} onPress={() => void handleSubmit()} />}
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
        {INCOME_CATEGORIES.map(cat => (
          <Chip
            key={cat}
            label={cat}
            active={cat === category}
            tone="success"
            onPress={() => setCategory(cat)}
          />
        ))}
      </View>

      {/* Description */}
      <TextField
        label="Açıklama"
        value={description}
        onChangeText={setDescription}
        placeholder="Ör: Müşteri ödemesi"
      />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  error: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
})
