import { useCallback, useMemo, useRef, useState } from 'react'
import {
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
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAppTheme } from '@/lib/ThemeContext'
import { STATUS_FILTERS, statusLabel, statusMatchesFilter } from '@/lib/status-labels'
import { Chip } from '@/components/ui/Chip'
import { EmptyState, ErrorBanner, LoadingBlock, StatPill } from '@/components/ui/States'

type Order = {
  id: string
  order_no: string | null
  customer_name: string | null
  customer_phone?: string | null
  status: string | null
  device_brand?: string | null
  device_model?: string | null
  updated_at?: string | null
  estimated_cost?: number | null
}

export default function AtolyeScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const router = useRouter()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!profile?.tenant_id) {
      setLoading(false)
      setError(profile ? 'Bayi hesabı bağlı değil' : 'Profil bekleniyor — yenileyin')
      return
    }
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      try {
        const json = await apiFetch('/api/service-orders?limit=80', { fresh }) as { data?: Order[] }
        setItems(json.data ?? [])
      } catch {
        const { data, error: qErr } = await supabase
          .from('service_orders')
          .select('id, order_no, customer_name, customer_phone, status, device_brand, device_model, updated_at, estimated_cost')
          .eq('tenant_id', profile.tenant_id)
          .order('updated_at', { ascending: false })
          .limit(80)
        if (qErr) throw qErr
        setItems((data as Order[]) ?? [])
      }
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile, profile?.tenant_id])

  useFocusEffect(useCallback(() => {
    void (async () => {
      if (!hasData.current) await load(false)
      else await load(true)
    })()
  }, [load]))

  const openItems = useMemo(
    () => items.filter(i => {
      const s = String(i.status || '').toLowerCase()
      return !['teslim', 'iptal', 'delivered', 'cancelled'].includes(s)
    }),
    [items],
  )

  const active = useMemo(
    () => openItems.filter(i => statusMatchesFilter(i.status, filter)),
    [openItems, filter],
  )

  const waiting = openItems.filter(i => /onay|bekliyor|waiting/i.test(String(i.status))).length
  const inProgress = openItems.filter(i => /tamir|islem|progress|atoly/i.test(String(i.status))).length

  if (loading && items.length === 0) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Atölye yükleniyor…" /></View>
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.stats}>
        <StatPill label="Açık" value={openItems.length} />
        <StatPill label="Onayda" value={waiting} tone="warning" />
        <StatPill label="İşlemde" value={inProgress} tone="success" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}

      <FlatList
        data={active}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="wrench"
            title="Açık iş yok"
            subtitle="Filtreyi değiştirin veya yeni kabul alın"
            actionLabel="Kabul’a git"
            onAction={() => router.push('/kabul')}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radiusLg,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={() => router.push(`/atolye/${item.id}`)}
          >
            <View style={styles.row}>
              <Text style={[styles.title, { color: colors.text }]}>{item.order_no || item.id.slice(0, 8)}</Text>
              <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
            <Text style={[styles.sub, { color: colors.text }]}>{item.customer_name || 'Müşteri'}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {[item.device_brand, item.device_model].filter(Boolean).join(' ') || 'Cihaz'}
              {item.customer_phone ? ` · ${item.customer_phone}` : ''}
            </Text>
            <View style={styles.footer}>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {item.updated_at ? new Date(item.updated_at).toLocaleString('tr-TR') : '—'}
              </Text>
              {item.estimated_cost != null ? (
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                  {Number(item.estimated_cost).toLocaleString('tr-TR')} ₺
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filters: { maxHeight: 48, marginTop: 10 },
  card: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '800', fontSize: 15 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sub: { marginTop: 4, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
})
