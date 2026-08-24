import React, { useState, useEffect } from 'react'
import { Pressable, Text, View, StyleSheet } from 'react-native'
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
  preselectedFrom?: AccountItem | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * TransferSheet — Bottom sheet for inter-account transfers.
 * Quick chips: Nakit→Banka, POS→Banka, Banka→Nakit.
 * source=target blocked. Action lock during submit.
 * No duplicate mutation: busy flag prevents double-tap.
 */
export function TransferSheet({ visible, accounts, preselectedFrom, onClose, onSuccess }: Props) {
  const { colors } = useAppTheme()
  const [busy, setBusy] = useState(false)
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('Hesaplar arası transfer')
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      const src = preselectedFrom || accounts[0]
      setFromId(src?.id || '')
      const tgt = accounts.find(a => a.id !== src?.id) || accounts[1]
      setToId(tgt?.id || '')
      setAmountStr('')
      setDescription('Hesaplar arası transfer')
      setError('')
    }
  }, [visible, preselectedFrom, accounts])

  const sourceAcc = accounts.find(a => a.id === fromId)
  const targetAcc = accounts.find(a => a.id === toId)
  const isSameAccount = fromId === toId
  const amount = parseLocaleNumber(amountStr) || 0

  const handleQuickSelect = (srcType: string, tgtType: string) => {
    const src = accounts.find(a => a.type === srcType)
    const tgt = accounts.find(a => a.type === tgtType)
    if (src && tgt && src.id !== tgt.id) {
      setFromId(src.id)
      setToId(tgt.id)
    }
  }

  const handleSubmit = async () => {
    if (isSameAccount) {
      setError('Kaynak ve hedef hesap aynı olamaz')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Geçerli bir tutar girin')
      return
    }
    if (sourceAcc && amount > sourceAcc.balance) {
      setError(`Yetersiz bakiye. Mevcut: ₺${sourceAcc.balance.toLocaleString('tr-TR')}`)
      return
    }

    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/accounts/transfer', {
        method: 'POST',
        body: JSON.stringify({
          source_account_id: fromId,
          target_account_id: toId,
          amount,
          description: description.trim() || undefined,
        }),
      })
      invalidateApiCache('/api/tenant/accounts')
      invalidateApiCache('/api/tenant/transactions')
      invalidateApiCache('/api/tenant/reports')
      showToast(`Transfer tamamlandı: ₺${amount.toLocaleString('tr-TR')}`, 'success')
      onSuccess()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transfer başarısız'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      title="⇄ Hesap Transferi"
      onClose={onClose}
      footer={
        <Button
          title="Transferi Tamamla"
          loading={busy}
          disabled={isSameAccount || busy}
          onPress={() => void handleSubmit()}
        />
      }
    >
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {/* Quick chips */}
      <View style={styles.chipRow}>
        <Chip label="Nakit → Banka" onPress={() => handleQuickSelect('kasa', 'banka')} />
        <Chip label="POS → Banka" onPress={() => handleQuickSelect('pos', 'banka')} />
        <Chip label="Banka → Nakit" onPress={() => handleQuickSelect('banka', 'kasa')} />
      </View>

      {/* Source account */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Kaynak Hesap</Text>
      <View style={styles.chipRow}>
        {accounts.map(acc => (
          <Chip
            key={acc.id}
            label={`${acc.name} (₺${acc.balance.toLocaleString('tr-TR')})`}
            active={acc.id === fromId}
            onPress={() => setFromId(acc.id)}
          />
        ))}
      </View>

      {/* Target account */}
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Hedef Hesap</Text>
      <View style={styles.chipRow}>
        {accounts.map(acc => (
          <Chip
            key={acc.id}
            label={`${acc.name} (₺${acc.balance.toLocaleString('tr-TR')})`}
            active={acc.id === toId}
            onPress={() => setToId(acc.id)}
          />
        ))}
      </View>

      {isSameAccount ? (
        <Text style={[styles.warning, { color: colors.danger }]}>⚠ Kaynak ve hedef hesap farklı olmalıdır</Text>
      ) : null}

      {/* Amount */}
      <TextField
        label="Transfer Tutarı (₺)"
        keyboardType="decimal-pad"
        value={amountStr}
        onChangeText={setAmountStr}
        placeholder="0,00"
      />

      {/* Preview */}
      {sourceAcc && targetAcc && amount > 0 && !isSameAccount ? (
        <View style={[styles.preview, { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.muted }]}>{sourceAcc.name} →</Text>
            <Text style={[styles.previewVal, { color: amount > sourceAcc.balance ? colors.danger : colors.text }]}>
              ₺{(sourceAcc.balance - amount).toLocaleString('tr-TR')}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.muted }]}>{targetAcc.name} →</Text>
            <Text style={[styles.previewVal, { color: colors.success }]}>
              ₺{(targetAcc.balance + amount).toLocaleString('tr-TR')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Description */}
      <TextField
        label="Açıklama"
        value={description}
        onChangeText={setDescription}
        placeholder="Ör: POS cirosunun bankaya aktarımı"
      />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  error: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  warning: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  preview: { padding: 12, borderWidth: 1, gap: 6, marginTop: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 12, fontWeight: '600' },
  previewVal: { fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
})
