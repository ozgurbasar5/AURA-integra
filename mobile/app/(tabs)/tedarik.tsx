import { useCallback, useRef, useState } from 'react'
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Order = {
  id: string
  order_no?: string
  supplier_name?: string
  status?: string
  total?: number
  created_at?: string
  items?: Array<{ name: string; qty: number; unit_price: number }>
}

export default function TedarikScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const hasData = useRef(false)
  const [form, setForm] = useState({
    supplier_name: '',
    item_name: '',
    qty: '1',
    unit_price: '',
  })

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/supplier-orders', { fresh }) as { items?: Order[] }
      setItems(json.items ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tedarik yüklenemedi')
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
    if (!form.supplier_name.trim() || !form.item_name.trim()) {
      setError('Tedarikçi ve ürün adı gerekli')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/supplier-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_name: form.supplier_name.trim(),
          items: [{
            name: form.item_name.trim(),
            qty: Number(form.qty) || 1,
            unit_price: Number(form.unit_price) || 0,
          }],
        }),
      })
      invalidateApiCache('/api/tenant/supplier-orders')
      setShowForm(false)
      setForm({ supplier_name: '', item_name: '', qty: '1', unit_price: '' })
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  async function receive(order: Order) {
    Alert.alert('Mal kabul', `${order.order_no || order.id.slice(0, 8)} stoğa alınsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kabul et',
        onPress: async () => {
          setBusy(true)
          try {
            await apiFetch('/api/tenant/supplier-orders/receive', {
              method: 'POST',
              body: JSON.stringify({ order_id: order.id }),
            })
            invalidateApiCache('/api/tenant/supplier-orders')
            invalidateApiCache('/api/tenant/parts')
            await load(true, true)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Mal kabul başarısız')
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  if (loading && !items.length) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Tedarik…" /></View>
  }

  return (
    <ModuleGuard tab="tedarik">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ padding: 16 }}>
        <Button title="Yeni sipariş" onPress={() => setShowForm(true)} />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="truck" title="Sipariş yok" actionLabel="Yeni sipariş" onAction={() => setShowForm(true)} />}
        renderItem={({ item }) => (
          <ListRow
            title={item.order_no || item.id.slice(0, 8)}
            subtitle={item.supplier_name}
            meta={`${item.status || '—'} · ${(item.items?.length ?? 0)} kalem`}
            right={
              item.status !== 'received' && item.status !== 'teslim_alindi' ? (
                <Button title="Kabul" variant="secondary" onPress={() => void receive(item)} disabled={busy} />
              ) : undefined
            }
          />
        )}
      />

      <FormModal
        visible={showForm}
        title="Tedarik siparişi"
        onClose={() => setShowForm(false)}
        footer={<Button title="Oluştur" loading={busy} onPress={() => void create()} />}
      >
        <TextField label="Tedarikçi" value={form.supplier_name} onChangeText={t => setForm(f => ({ ...f, supplier_name: t }))} />
        <TextField label="Ürün" value={form.item_name} onChangeText={t => setForm(f => ({ ...f, item_name: t }))} />
        <TextField label="Adet" keyboardType="number-pad" value={form.qty} onChangeText={t => setForm(f => ({ ...f, qty: t }))} />
        <TextField label="Birim fiyat" keyboardType="decimal-pad" value={form.unit_price} onChangeText={t => setForm(f => ({ ...f, unit_price: t }))} />
      </FormModal>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
