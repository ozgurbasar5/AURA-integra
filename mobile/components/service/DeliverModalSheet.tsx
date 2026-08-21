import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { FormModal } from '@/components/ui/FormModal'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useAppTheme } from '@/lib/ThemeContext'

const PAYMENTS = [
  { id: 'nakit', label: 'Nakit Kasa', icon: 'money' },
  { id: 'kredi_karti', label: 'POS / Kredi Kartı', icon: 'credit-card' },
  { id: 'havale', label: 'Banka / Havale', icon: 'bank' },
  { id: 'veresiye', label: 'Veresiye / Cari', icon: 'address-book' },
]

type Props = {
  visible: boolean
  orderNo: string
  customerName: string
  initialFee: number | string
  onClose: () => void
  onDeliver: (fee: number, paymentMethod: string) => Promise<void>
  busy?: boolean
}

export function DeliverModalSheet({
  visible,
  orderNo,
  customerName,
  initialFee,
  onClose,
  onDeliver,
  busy,
}: Props) {
  const { colors } = useAppTheme()
  const [fee, setFee] = useState(String(initialFee || ''))
  const [payment, setPayment] = useState('nakit')
  const [error, setError] = useState('')

  const handleDeliver = async () => {
    const amount = Number(fee)
    if (isNaN(amount) || amount < 0) {
      setError('Geçerli bir servis ücreti girin')
      return
    }
    setError('')
    try {
      await onDeliver(amount, payment)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Teslimat işlemi başarısız')
    }
  }

  return (
    <FormModal
      visible={visible}
      title="Cihaz Teslimatı & Tahsilat"
      onClose={onClose}
      footer={
        <Button
          title="Teslimatı Tamamla"
          loading={busy}
          onPress={() => void handleDeliver()}
          style={{ backgroundColor: colors.success, minHeight: 52 }}
        />
      }
    >
      <View style={[styles.infoBanner, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Text style={[styles.orderNo, { color: colors.primary }]}>{orderNo}</Text>
        <Text style={[styles.customerName, { color: colors.text }]}>{customerName}</Text>
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <TextField
        label="Tahsil Edilen Ücret (₺)"
        keyboardType="decimal-pad"
        value={fee}
        onChangeText={setFee}
        placeholder="0.00"
      />

      <Text style={[styles.sectionLabel, { color: colors.muted }]}>ÖDEME YÖNTEMİ</Text>
      <View style={styles.paymentGrid}>
        {PAYMENTS.map(p => (
          <Chip
            key={p.id}
            label={p.label}
            active={payment === p.id}
            onPress={() => setPayment(p.id)}
          />
        ))}
      </View>

      <Text style={[styles.helpText, { color: colors.muted }]}>
        Teslimat tamamlandığında kasa bakiyesi otomatik güncellenir ve servis arşive aktarılır.
      </Text>
    </FormModal>
  )
}

const styles = StyleSheet.create({
  infoBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    marginBottom: 8,
  },
  orderNo: { fontSize: 16, fontWeight: '900' },
  customerName: { fontSize: 14, fontWeight: '700' },
  errorText: { fontWeight: '700', fontSize: 13, marginBottom: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  helpText: { fontSize: 12, lineHeight: 16, marginTop: 8 },
})
