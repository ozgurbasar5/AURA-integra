import { useCallback, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
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
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Purchase = {
  id: string
  supplier_name?: string
  category?: string
  quantity?: number
  buy_price?: number
  total_cost?: number
  created_at?: string
  device_brand?: string
  device_model?: string
  imei?: string
  payment_method?: string
}

const CATEGORIES = [
  { id: 'yedek_parca', label: 'Yedek parça' },
  { id: 'aksesuar', label: 'Aksesuar' },
  { id: 'telefon', label: 'Telefon' },
  { id: 'ikinci_el', label: '2. el' },
]

export default function AlisScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const hasData = useRef(false)
  const [form, setForm] = useState({
    supplier_name: '',
    category: 'yedek_parca',
    device_brand: '',
    device_model: '',
    quantity: '1',
    buy_price: '',
    payment_method: 'nakit',
  })

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/purchases', { fresh }) as { items?: Purchase[] }
      setItems(json.items ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alışlar yüklenemedi')
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

  async function createPurchase() {
    const qty = Number(form.quantity)
    const price = Number(form.buy_price)
    if (!form.supplier_name.trim() || !qty || price < 0) {
      setError('Tedarikçi, miktar ve alış fiyatı gerekli')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      supplier_name: form.supplier_name.trim(),
      category: form.category,
      device_brand: form.device_brand.trim() || undefined,
      device_model: form.device_model.trim() || undefined,
      quantity: qty,
      buy_price: price,
      payment_method: form.payment_method,
      create_stock: true,
    }
    const resetForm = () => {
      setShowForm(false)
      setForm({
        supplier_name: '',
        category: 'yedek_parca',
        device_brand: '',
        device_model: '',
        quantity: '1',
        buy_price: '',
        payment_method: 'nakit',
      })
    }
    try {
      await apiFetch('/api/tenant/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      invalidateApiCache('/api/tenant/purchases')
      invalidateApiCache('/api/tenant/parts')
      resetForm()
      await load(true, true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Alış kaydedilemedi'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu|zaman aşımı/i.test(msg)) {
        await enqueueJob({
          path: '/api/tenant/purchases',
          method: 'POST',
          body: payload,
          label: `Alış ${payload.supplier_name}`,
        })
        resetForm()
        Alert.alert('Çevrimdışı kaydedildi', 'Bağlantı yok — alış kuyruğa alındı. Ana ekrandan gönderebilirsiniz.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModuleGuard tab="alis">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.toolbar}>
        <Button title="Yeni alış" onPress={() => setShowForm(true)} style={{ flex: 1 }} />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      {loading && !items.length ? (
        <LoadingBlock label="Alışlar yükleniyor…" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="truck"
              title="Alış kaydı yok"
              subtitle="Yeni alış ekleyerek stok girişi yapın"
              actionLabel="Yeni alış"
              onAction={() => setShowForm(true)}
            />
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.supplier_name || 'Tedarikçi'}
              subtitle={[item.category, item.device_brand, item.device_model].filter(Boolean).join(' · ') || 'Alış'}
              meta={`${item.quantity ?? 0} adet${item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString('tr-TR')}` : ''}`}
              right={
                <Text style={{ color: colors.primary, fontWeight: '800' }}>
                  {(Number(item.total_cost) || Number(item.buy_price) * Number(item.quantity) || 0).toLocaleString('tr-TR')} ₺
                </Text>
              }
            />
          )}
        />
      )}

      <FormModal
        visible={showForm}
        title="Yeni alış"
        onClose={() => setShowForm(false)}
        footer={
          <Button title="Kaydet" loading={busy} onPress={() => void createPurchase()} />
        }
      >
        <TextField
          label="Tedarikçi"
          value={form.supplier_name}
          onChangeText={t => setForm(f => ({ ...f, supplier_name: t }))}
          placeholder="Firma adı"
        />
        <Text style={[styles.label, { color: colors.muted }]}>Kategori</Text>
        <View style={styles.chips}>
          {CATEGORIES.map(c => (
            <Chip
              key={c.id}
              label={c.label}
              active={form.category === c.id}
              onPress={() => setForm(f => ({ ...f, category: c.id }))}
            />
          ))}
        </View>
        <TextField
          label="Marka"
          value={form.device_brand}
          onChangeText={t => setForm(f => ({ ...f, device_brand: t }))}
        />
        <TextField
          label="Model / ürün"
          value={form.device_model}
          onChangeText={t => setForm(f => ({ ...f, device_model: t }))}
        />
        <TextField
          label="Miktar"
          keyboardType="number-pad"
          value={form.quantity}
          onChangeText={t => setForm(f => ({ ...f, quantity: t }))}
        />
        <TextField
          label="Birim alış fiyatı"
          keyboardType="decimal-pad"
          value={form.buy_price}
          onChangeText={t => setForm(f => ({ ...f, buy_price: t }))}
        />
        <Text style={[styles.label, { color: colors.muted }]}>Ödeme</Text>
        <View style={styles.chips}>
          {[
            { id: 'nakit', label: 'Nakit' },
            { id: 'kredi_karti', label: 'Kart' },
            { id: 'havale', label: 'Havale' },
          ].map(p => (
            <Chip
              key={p.id}
              label={p.label}
              active={form.payment_method === p.id}
              onPress={() => setForm(f => ({ ...f, payment_method: p.id }))}
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
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
