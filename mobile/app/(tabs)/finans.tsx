import { useCallback, useRef, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock, StatPill } from '@/components/ui/States'

type Tx = {
  id?: string
  type?: string
  description?: string
  amount?: number
  category?: string
  payment_method?: string
  transaction_date?: string
  created_at?: string
}

export default function FinansScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<{ gelir: number; gider: number }>({ gelir: 0, gider: 0 })
  const hasData = useRef(false)
  const [form, setForm] = useState({
    type: 'gelir' as 'gelir' | 'gider',
    description: '',
    amount: '',
    category: 'Genel',
    payment_method: 'nakit',
  })

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      // Cari ledger üzerinden son hareketler + stats
      const [cari, home] = await Promise.all([
        apiFetch('/api/tenant/cari', { fresh }) as Promise<{ ledger?: Tx[] }>,
        apiFetch('/api/tenant/stats', { fresh }) as Promise<{ stats?: Record<string, number> }>,
      ])
      const ledger = (cari.ledger ?? []).slice(0, 40)
      setItems(ledger)
      let gelir = 0
      let gider = 0
      for (const t of ledger) {
        if (t.type === 'gelir') gelir += Number(t.amount) || 0
        else gider += Number(t.amount) || 0
      }
      setStats({ gelir, gider })
      hasData.current = true
      setError('')
      void home
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Finans yüklenemedi')
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

  async function create() {
    const amount = Number(form.amount)
    if (!form.description.trim() || !amount) {
      setError('Açıklama ve tutar gerekli')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/transactions', {
        method: 'POST',
        body: JSON.stringify({
          transaction: {
            type: form.type,
            description: form.description.trim(),
            amount,
            category: form.category,
            payment_method: form.payment_method,
            transaction_date: new Date().toISOString(),
          },
        }),
      })
      invalidateApiCache('/api/tenant/cari')
      setShowForm(false)
      setForm({ type: 'gelir', description: '', amount: '', category: 'Genel', payment_method: 'nakit' })
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !items.length) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Finans…" /></View>
  }

  return (
    <ModuleGuard tab="finans">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatPill label="Gelir" value={`${Math.round(stats.gelir).toLocaleString('tr-TR')}₺`} tone="success" />
          <StatPill label="Gider" value={`${Math.round(stats.gider).toLocaleString('tr-TR')}₺`} tone="danger" />
        </View>
        <Button title="Gelir / gider ekle" onPress={() => setShowForm(true)} />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      <FlatList
        data={items}
        keyExtractor={(i, idx) => i.id || String(idx)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="line-chart" title="Hareket yok" subtitle="Gelir/gider ekleyin" />}
        renderItem={({ item }) => (
          <ListRow
            title={item.description || item.category || 'Hareket'}
            subtitle={item.category}
            meta={item.transaction_date ? new Date(item.transaction_date).toLocaleString('tr-TR') : undefined}
            right={
              <Text style={{
                fontWeight: '800',
                color: item.type === 'gelir' ? colors.success : colors.danger,
              }}>
                {item.type === 'gelir' ? '+' : '-'}{(Number(item.amount) || 0).toLocaleString('tr-TR')} ₺
              </Text>
            }
          />
        )}
      />

      <FormModal
        visible={showForm}
        title="Yeni hareket"
        onClose={() => setShowForm(false)}
        footer={<Button title="Kaydet" loading={busy} onPress={() => void create()} />}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Gelir" active={form.type === 'gelir'} onPress={() => setForm(f => ({ ...f, type: 'gelir' }))} />
          <Chip label="Gider" active={form.type === 'gider'} tone="danger" onPress={() => setForm(f => ({ ...f, type: 'gider' }))} />
        </View>
        <TextField label="Açıklama" value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} />
        <TextField label="Tutar" keyboardType="decimal-pad" value={form.amount} onChangeText={t => setForm(f => ({ ...f, amount: t }))} />
        <TextField label="Kategori" value={form.category} onChangeText={t => setForm(f => ({ ...f, category: t }))} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['nakit', 'kredi_karti', 'havale'].map(p => (
            <Chip key={p} label={p} active={form.payment_method === p} onPress={() => setForm(f => ({ ...f, payment_method: p }))} />
          ))}
        </View>
      </FormModal>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
