import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AuraColors } from '@/constants/AuraColors'
import { STATUS_FILTERS, statusLabel, statusMatchesFilter } from '@/lib/status-labels'

type Order = {
  id: string
  order_no: string | null
  customer_name: string | null
  status: string | null
  device_brand?: string | null
  device_model?: string | null
}

export default function AtolyeScreen() {
  const { profile } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('service_orders')
        .select('id, order_no, customer_name, status, device_brand, device_model')
        .eq('tenant_id', profile.tenant_id)
        .order('updated_at', { ascending: false })
        .limit(80)
      if (qErr) throw qErr
      setItems((data as Order[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const active = useMemo(
    () => items.filter(i => {
      const s = String(i.status || '').toLowerCase()
      if (['teslim', 'iptal', 'delivered', 'cancelled'].includes(s)) return false
      return statusMatchesFilter(i.status, filter)
    }),
    [items, filter],
  )

  if (loading && items.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={AuraColors.primary} /></View>
  }

  return (
    <View style={styles.root}>
      <Text style={styles.hint}>{active.length} açık iş</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {STATUS_FILTERS.map(f => (
          <Pressable
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={active}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>Açık atölye kaydı yok</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/atolye/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.order_no || item.id.slice(0, 8)}</Text>
              <Text style={styles.badge}>{statusLabel(item.status)}</Text>
            </View>
            <Text style={styles.sub}>{item.customer_name || 'Müşteri'}</Text>
            <Text style={styles.meta}>
              {[item.device_brand, item.device_model].filter(Boolean).join(' ') || 'Cihaz'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { paddingHorizontal: 16, paddingTop: 12, color: AuraColors.muted, fontSize: 12 },
  filters: { maxHeight: 44, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AuraColors.card,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  chipActive: { backgroundColor: '#e0f2fe', borderColor: AuraColors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: AuraColors.muted },
  chipTextActive: { color: AuraColors.primary },
  error: { color: AuraColors.danger, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: AuraColors.muted, marginTop: 40 },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '800', color: AuraColors.text },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: AuraColors.primary,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sub: { color: AuraColors.text, marginTop: 4 },
  meta: { color: AuraColors.muted, fontSize: 12, marginTop: 2 },
})
