import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { enqueueJob } from '@/lib/offline-queue'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { SearchBar } from '@/components/ui/SearchBar'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Balance = { customer_name: string; borc: number; tahsilat: number; bakiye: number }

const PAYMENTS = [
  { id: 'nakit', label: 'Nakit' },
  { id: 'kredi_karti', label: 'Kart' },
  { id: 'havale', label: 'Havale' },
]

export default function CariScreen() {
  const { colors } = useAppTheme()
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<Balance | null>(null)
  const [amount, setAmount] = useState('')
  const [payment, setPayment] = useState('nakit')
  const [busy, setBusy] = useState(false)
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/cari', { fresh }) as { balances?: Balance[]; items?: Balance[] }
      setBalances(json.balances ?? json.items ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cari yüklenemedi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    void (async () => {
      if (!hasData.current) await load(false)
      else await load(true)
    })()
  }, [load]))

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return balances
    return balances.filter(b => b.customer_name.toLowerCase().includes(s))
  }, [balances, q])

  async function collect() {
    if (!modal) return
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('Tutar girin')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      action: 'tahsilat',
      customer_name: modal.customer_name,
      amount: amt,
      payment_method: payment,
    }
    const resetForm = () => {
      setModal(null)
      setAmount('')
      setPayment('nakit')
    }
    try {
      await apiFetch('/api/tenant/cari', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      invalidateApiCache('/api/tenant/cari')
      resetForm()
      await load(true, true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tahsilat başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu|zaman aşımı/i.test(msg)) {
        await enqueueJob({
          path: '/api/tenant/cari',
          method: 'POST',
          body: payload,
          label: `Tahsilat ${payload.customer_name}`,
        })
        resetForm()
        Alert.alert('Çevrimdışı kaydedildi', 'Bağlantı yok — tahsilat kuyruğa alındı. Ana ekrandan gönderebilirsiniz.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModuleGuard tab="cari">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Müşteri ara…"
        />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      {loading && !balances.length ? (
        <LoadingBlock label="Cari yükleniyor…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.customer_name}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState icon="users" title="Cari bakiye yok" subtitle="Tahsilat veya satış sonrası burada görünür" />
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.customer_name}
              subtitle={`Borç ${item.borc.toLocaleString('tr-TR')} · Tahsilat ${item.tahsilat.toLocaleString('tr-TR')}`}
              right={
                <Text style={{
                  fontWeight: '800',
                  fontSize: 16,
                  color: item.bakiye > 0 ? colors.danger : colors.success,
                }}>
                  {item.bakiye.toLocaleString('tr-TR')} ₺
                </Text>
              }
              onPress={() => { setModal(item); setAmount(''); setPayment('nakit') }}
            />
          )}
        />
      )}

      <FormModal
        visible={!!modal}
        title={modal?.customer_name || 'Tahsilat'}
        onClose={() => setModal(null)}
        footer={<Button title="Tahsilat al" loading={busy} onPress={() => void collect()} />}
      >
        <Text style={{ color: colors.muted }}>
          Bakiye: {modal?.bakiye.toLocaleString('tr-TR')} ₺
        </Text>
        <TextField
          label="Tutar"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
        />
        <Text style={[styles.label, { color: colors.muted }]}>Ödeme tipi</Text>
        <View style={styles.chips}>
          {PAYMENTS.map(p => (
            <Chip
              key={p.id}
              label={p.label}
              active={payment === p.id}
              onPress={() => setPayment(p.id)}
            />
          ))}
        </View>
      </FormModal>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
