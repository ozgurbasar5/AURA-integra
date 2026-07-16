import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { AuraColors } from '@/constants/AuraColors'
import { printLabel } from '@/lib/label-print'

type Device = {
  id: string
  brand?: string
  model?: string
  imei?: string
  barcode?: string
  sell_price?: number
  sale_price?: number
  status?: string
}

export default function VitrinScreen() {
  const [items, setItems] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const json = await apiFetch('/api/tenant/showcase') as { items?: Device[] }
      setItems((json.items ?? []).filter(d => d.status !== 'sold' && d.status !== 'satildi'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vitrin yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function sell(d: Device) {
    const price = Number(d.sell_price ?? d.sale_price) || 0
    Alert.alert('Satış', `${d.brand} ${d.model} — ${price} ₺`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Nakit sat',
        onPress: () => void doSell(d, 'nakit'),
      },
      {
        text: 'Kart sat',
        onPress: () => void doSell(d, 'kredi_karti'),
      },
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
      await load()
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
    <View style={styles.root}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !items.length ? (
        <ActivityIndicator color={AuraColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<Text style={styles.empty}>Vitrinde cihaz yok</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.brand} {item.model}</Text>
              <Text style={styles.price}>
                {(Number(item.sell_price ?? item.sale_price) || 0).toLocaleString('tr-TR')} ₺
              </Text>
              {item.imei ? <Text style={styles.meta}>IMEI {item.imei}</Text> : null}
              <View style={styles.row}>
                <Pressable style={styles.sellBtn} disabled={busy === item.id} onPress={() => void sell(item)}>
                  <Text style={styles.btnText}>{busy === item.id ? '…' : 'Sat'}</Text>
                </Pressable>
                <Pressable style={styles.labelBtn} onPress={() => void label(item)}>
                  <Text style={styles.btnText}>Etiket</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
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
  price: { fontWeight: '800', fontSize: 17, color: AuraColors.primary },
  meta: { fontSize: 12, color: AuraColors.muted },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sellBtn: {
    flex: 1,
    backgroundColor: AuraColors.success,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBtn: {
    flex: 1,
    backgroundColor: AuraColors.primaryDark,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
})
