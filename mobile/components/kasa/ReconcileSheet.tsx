import React, { useState, useEffect } from 'react'
import { Text, View, StyleSheet } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { FormModal } from '@/components/ui/FormModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Chip } from '@/components/ui/Chip'
import { useAppTheme } from '@/lib/ThemeContext'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { parseLocaleNumber } from '@/lib/parse-locale-number'
import type { AccountItem } from './AccountCardStrip'

type Props = {
  visible: boolean
  accounts: AccountItem[]
  preselectedAccount?: AccountItem | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * ReconcileSheet — Bottom sheet for physical count reconciliation.
 * System balance is READ-ONLY (from server, never client-editable).
 * Two separate actions: [Sayımı Kaydet] and [Farkı Düzelt].
 */
export function ReconcileSheet({ visible, accounts, preselectedAccount, onClose, onSuccess }: Props) {
  const { colors } = useAppTheme()
  const [busy, setBusy] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [countedStr, setCountedStr] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      const def = preselectedAccount || accounts.find(a => a.is_default) || accounts[0]
      setAccountId(def?.id || '')
      setCountedStr('')
      setNotes('')
      setError('')
    }
  }, [visible, preselectedAccount, accounts])

  const activeAccount = accounts.find(a => a.id === accountId)
  const systemBalance = activeAccount ? Number(activeAccount.balance) || 0 : 0
  const countedBalance = parseLocaleNumber(countedStr)
  const hasCounted = countedStr.trim() !== '' && Number.isFinite(countedBalance)
  const difference = hasCounted ? Math.round((countedBalance - systemBalance) * 100) / 100 : 0
  const isMatch = hasCounted && Math.abs(difference) < 0.01

  const submitReconciliation = async (autoAdjust: boolean) => {
    if (!hasCounted) {
      setError('Sayılan tutarı girin')
      return
    }
    if (!accountId) {
      setError('Hesap seçin')
      return
    }

    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/finance/reconcile', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          counted_balance: countedBalance,
          auto_adjust: autoAdjust,
          notes: notes.trim() || undefined,
        }),
      })
      invalidateApiCache('/api/tenant/accounts')
      invalidateApiCache('/api/tenant/transactions')
      showToast(
        autoAdjust
          ? `Bakiye düzeltildi (Fark: ₺${difference.toLocaleString('tr-TR')})`
          : `Sayım kaydedildi (Fark: ₺${difference.toLocaleString('tr-TR')})`,
        'success'
      )
      onSuccess()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Mutabakat başarısız'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      title="↔ Mutabakat (Sayım)"
      onClose={onClose}
      footer={
        <View style={styles.footerRow}>
          <Button
            title="Sayımı Kaydet"
            variant="secondary"
            loading={busy}
            disabled={!hasCounted || busy}
            onPress={() => void submitReconciliation(false)}
            style={{ flex: 1 }}
          />
          {!isMatch && hasCounted ? (
            <Button
              title="Farkı Düzelt"
              variant="danger"
              loading={busy}
              disabled={busy}
              onPress={() => void submitReconciliation(true)}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      }
    >
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {/* Account */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Sayım Yapılan Hesap</Text>
      <View style={styles.chipRow}>
        {accounts.map(acc => (
          <Chip
            key={acc.id}
            label={acc.name}
            active={acc.id === accountId}
            onPress={() => setAccountId(acc.id)}
          />
        ))}
      </View>

      {/* System balance (READ-ONLY) */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Sistem Bakiyesi (Defter)</Text>
      <View style={[styles.readonlyField, { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.readonlyValue, { color: colors.text }]}>
          ₺{systemBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <FontAwesome name="lock" size={12} color={colors.muted} />
      </View>

      {/* Counted balance */}
      <TextField
        label="Fiziksel Sayım (Kasadaki)"
        keyboardType="decimal-pad"
        value={countedStr}
        onChangeText={setCountedStr}
        placeholder="0,00"
      />

      {/* Difference indicator */}
      {hasCounted ? (
        <View
          style={[
            styles.diffBox,
            {
              backgroundColor: isMatch ? colors.successSoft : difference > 0 ? colors.primarySoft : colors.dangerSoft,
              borderColor: isMatch ? colors.success : difference > 0 ? colors.primary : colors.danger,
              borderRadius: colors.radius,
            },
          ]}
        >
          <FontAwesome
            name={isMatch ? 'check-circle' : 'exclamation-triangle'}
            size={14}
            color={isMatch ? colors.success : difference > 0 ? colors.primary : colors.danger}
          />
          <Text
            style={[
              styles.diffText,
              { color: isMatch ? colors.success : difference > 0 ? colors.primary : colors.danger },
            ]}
          >
            {isMatch ? 'Bakiye eşleşiyor' : difference > 0 ? 'Kasa Fazlası' : 'Kasa Açığı'}
          </Text>
          <Text
            style={[
              styles.diffAmount,
              { color: isMatch ? colors.success : difference > 0 ? colors.primary : colors.danger },
            ]}
          >
            {difference > 0 ? '+' : ''}₺{difference.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      ) : null}

      {/* Notes */}
      <TextField
        label="Sayım Notu"
        value={notes}
        onChangeText={setNotes}
        placeholder="Ör: Akşam sayımı, eksik madeni para"
      />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  error: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  readonlyValue: { fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  diffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  diffText: { fontSize: 13, fontWeight: '700', flex: 1, marginLeft: 8 },
  diffAmount: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  footerRow: { flexDirection: 'row', gap: 8 },
})
