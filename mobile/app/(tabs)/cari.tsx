import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { AuraColors } from '@/constants/AuraColors'

type Balance = { customer_name: string; borc: number; tahsilat: number; bakiye: number }

export default function CariScreen() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<Balance | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const json = await apiFetch('/api/tenant/cari') as { balances?: Balance[] }
      setBalances(json.balances ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cari yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function collect() {
    if (!modal) return
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('Tutar girin')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/cari', {
        method: 'POST',
        body: JSON.stringify({
          action: 'tahsilat',
          customer_name: modal.customer_name,
          amount: amt,
          payment_method: 'nakit',
        }),
      })
      setModal(null)
      setAmount('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tahsilat başarısız')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !balances.length ? (
        <ActivityIndicator color={AuraColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={balances}
          keyExtractor={i => i.customer_name}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<Text style={styles.empty}>Cari kayıt yok</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => { setModal(item); setAmount('') }}>
              <Text style={styles.name}>{item.customer_name}</Text>
              <Text style={[styles.bal, item.bakiye > 0 ? styles.debt : styles.ok]}>
                {item.bakiye.toLocaleString('tr-TR')} ₺
              </Text>
              <Text style={styles.meta}>Borç {item.borc} · Tahsilat {item.tahsilat}</Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{modal?.customer_name}</Text>
            <Text style={styles.meta}>Bakiye: {modal?.bakiye.toLocaleString('tr-TR')} ₺</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Tahsilat tutarı"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={AuraColors.muted}
            />
            <Pressable style={styles.btn} disabled={busy} onPress={() => void collect()}>
              <Text style={styles.btnText}>{busy ? '…' : 'Tahsilat al'}</Text>
            </Pressable>
            <Pressable onPress={() => setModal(null)}>
              <Text style={styles.cancel}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  error: { color: AuraColors.danger, padding: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: AuraColors.muted, marginTop: 40 },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 4,
  },
  name: { fontWeight: '800', color: AuraColors.text, fontSize: 15 },
  bal: { fontWeight: '800', fontSize: 18 },
  debt: { color: AuraColors.danger },
  ok: { color: AuraColors.success },
  meta: { fontSize: 12, color: AuraColors.muted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: AuraColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  sheetTitle: { fontWeight: '800', fontSize: 18, color: AuraColors.text },
  input: {
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    padding: 12,
    fontWeight: '700',
    color: AuraColors.text,
  },
  btn: {
    backgroundColor: AuraColors.success,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
  cancel: { textAlign: 'center', color: AuraColors.muted, fontWeight: '700', padding: 8 },
})
