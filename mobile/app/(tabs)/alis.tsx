import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { AuraColors } from '@/constants/AuraColors'

type Purchase = {
  id: string
  supplier_name?: string
  category?: string
  quantity?: number
  buy_price?: number
  total_cost?: number
  created_at?: string
  part_name?: string
  product_name?: string
}

export default function AlisScreen() {
  const [items, setItems] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const json = await apiFetch('/api/tenant/purchases') as { items?: Purchase[] }
      setItems(json.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alışlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

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
          ListEmptyComponent={<Text style={styles.empty}>Alış kaydı yok</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.supplier_name || 'Tedarikçi'}</Text>
              <Text style={styles.meta}>
                {item.part_name || item.product_name || item.category || '—'}
                {' · '}
                {item.quantity ?? 0} adet
              </Text>
              <Text style={styles.price}>
                {(Number(item.total_cost) || Number(item.buy_price) * Number(item.quantity) || 0).toLocaleString('tr-TR')} ₺
              </Text>
              {item.created_at ? (
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString('tr-TR')}
                </Text>
              ) : null}
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
  meta: { fontSize: 13, color: AuraColors.muted },
  price: { fontWeight: '800', fontSize: 16, color: AuraColors.primary },
  date: { fontSize: 11, color: AuraColors.muted },
})
