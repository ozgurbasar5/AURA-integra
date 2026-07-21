import { useCallback, useRef, useState } from 'react'
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
import { printLabel } from '@/lib/label-print'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Device = {
  id: string
  brand?: string
  model?: string
  imei?: string
  barcode?: string
  sell_price?: number
  sale_price?: number
  buy_price?: number
  status?: string
  condition?: string
}

export default function VitrinScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasData = useRef(false)
  const [form, setForm] = useState({
    brand: '',
    model: '',
    imei: '',
    sell_price: '',
    buy_price: '',
    condition: 'iyi',
  })

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/showcase', { fresh }) as { items?: Device[] }
      setItems((json.items ?? []).filter(d => d.status !== 'sold' && d.status !== 'satildi'))
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vitrin yüklenemedi')
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

  async function createDevice() {
    if (!form.brand.trim() || !form.model.trim()) {
      setError('Marka ve model gerekli')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiFetch('/api/tenant/showcase', {
        method: 'POST',
        body: JSON.stringify({
          brand: form.brand.trim(),
          model: form.model.trim(),
          imei: form.imei.trim() || undefined,
          sell_price: Number(form.sell_price) || 0,
          buy_price: Number(form.buy_price) || 0,
          condition: form.condition,
        }),
      })
      invalidateApiCache('/api/tenant/showcase')
      setShowForm(false)
      setForm({ brand: '', model: '', imei: '', sell_price: '', buy_price: '', condition: 'iyi' })
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function sell(d: Device) {
    const price = Number(d.sell_price ?? d.sale_price) || 0
    Alert.alert('Satış', `${d.brand} ${d.model} — ${price} ₺`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Nakit sat', onPress: () => void doSell(d, 'nakit') },
      { text: 'Kart sat', onPress: () => void doSell(d, 'kredi_karti') },
    ])
  }

  async function doSell(d: Device, payment: string) {
    setBusy(d.id)
    setError('')
    try {
      await apiFetch('/api/tenant/showcase/sell', {
        method: 'POST',
        body: JSON.stringify({
          device_id: d.id,
          payment_method: payment,
          sell_price: Number(d.sell_price ?? d.sale_price) || undefined,
        }),
      })
      invalidateApiCache('/api/tenant/showcase')
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Satış başarısız')
    } finally {
      setBusy(null)
    }
  }

  async function label(d: Device) {
    const r = await printLabel({
      title: `${d.brand || ''} ${d.model || ''}`.trim(),
      subtitle: `${Number(d.sell_price ?? d.sale_price) || 0} ₺`,
      imei: d.imei,
      barcode: d.barcode,
    })
    if (!r.ok) setError(r.error || 'Etiket yazdırılamadı')
  }

  return (
    <ModuleGuard tab="vitrin">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.toolbar}>
        <Button title="Cihaz ekle" onPress={() => setShowForm(true)} />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      {loading && !items.length ? (
        <LoadingBlock label="Vitrin yükleniyor…" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="mobile"
              title="Vitrinde cihaz yok"
              subtitle="2. el cihaz ekleyin"
              actionLabel="Cihaz ekle"
              onAction={() => setShowForm(true)}
            />
          }
          renderItem={({ item }) => (
            <View style={{ marginBottom: 4 }}>
              <ListRow
                title={`${item.brand || ''} ${item.model || ''}`.trim()}
                subtitle={item.imei ? `IMEI ${item.imei}` : item.condition || undefined}
                right={
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {(Number(item.sell_price ?? item.sale_price) || 0).toLocaleString('tr-TR')} ₺
                  </Text>
                }
              />
              <View style={styles.row}>
                <Button
                  title={busy === item.id ? '…' : 'Sat'}
                  onPress={() => void sell(item)}
                  disabled={busy === item.id}
                  style={{ flex: 1 }}
                />
                <Button title="Etiket" variant="secondary" onPress={() => void label(item)} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        />
      )}

      <FormModal
        visible={showForm}
        title="Vitrine ekle"
        onClose={() => setShowForm(false)}
        footer={<Button title="Kaydet" loading={saving} onPress={() => void createDevice()} />}
      >
        <TextField label="Marka" value={form.brand} onChangeText={t => setForm(f => ({ ...f, brand: t }))} />
        <TextField label="Model" value={form.model} onChangeText={t => setForm(f => ({ ...f, model: t }))} />
        <TextField label="IMEI" value={form.imei} onChangeText={t => setForm(f => ({ ...f, imei: t }))} />
        <TextField label="Alış fiyatı" keyboardType="decimal-pad" value={form.buy_price} onChangeText={t => setForm(f => ({ ...f, buy_price: t }))} />
        <TextField label="Satış fiyatı" keyboardType="decimal-pad" value={form.sell_price} onChangeText={t => setForm(f => ({ ...f, sell_price: t }))} />
        <TextField label="Durum" value={form.condition} onChangeText={t => setForm(f => ({ ...f, condition: t }))} placeholder="iyi / orta / kötü" />
      </FormModal>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 10 },
})
