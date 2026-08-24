import { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
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
import { STATUS_FILTERS, statusMatchesFilter } from '@/lib/status-labels'
import { Chip } from '@/components/ui/Chip'
import { EmptyState, ErrorBanner, LoadingBlock, StatPill } from '@/components/ui/States'
import { ServiceCardItem, type ServiceOrderSummary } from '@/components/service/ServiceCardItem'
import { StatusActionSheet } from '@/components/service/StatusActionSheet'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'

export default function AtolyeScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const router = useRouter()

  const [items, setItems] = useState<ServiceOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrderSummary | null>(null)
  const hasData = useRef(false)

  const load = useCallback(
    async (fresh = false, isRefresh = false) => {
      if (!profile?.tenant_id) {
        setLoading(false)
        setError(profile ? 'Bayi hesabı bağlı değil' : 'Profil bekleniyor — yenileyin')
        return
      }
      if (!hasData.current && !isRefresh) setLoading(true)
      if (isRefresh) setRefreshing(true)
      try {
        const json = (await apiFetch('/api/service-orders?limit=80', { fresh })) as { data?: ServiceOrderSummary[] }
        setItems(json.data ?? [])
        hasData.current = true
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Servis kayıtları yüklenemedi')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [profile, profile?.tenant_id],
  )

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await load(false)
      })()
    }, [load]),
  )

  async function handleQuickStatusChange(newStatus: string) {
    if (!selectedOrder) return
    const orderId = selectedOrder.id
    // Optimistic update
    setItems(prev => prev.map(i => (i.id === orderId ? { ...i, status: newStatus } : i)))
    try {
      await apiFetch(`/api/service-orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Durum güncellenemedi')
      await load(true, true)
    } finally {
      setSelectedOrder(null)
    }
  }

  const openItems = useMemo(
    () =>
      items.filter(i => {
        const s = String(i.status || '').toLowerCase()
        return !['teslim', 'iptal', 'delivered', 'cancelled'].includes(s)
      }),
    [items],
  )

  const active = useMemo(
    () => (filter === 'all' ? openItems : openItems.filter(i => statusMatchesFilter(i.status, filter))),
    [openItems, filter],
  )

  const waiting = openItems.filter(i => /onay|bekliyor|waiting/i.test(String(i.status))).length
  const inProgress = openItems.filter(i => /tamir|islem|progress|atoly/i.test(String(i.status))).length
  const ready = openItems.filter(i => /hazir|qc|kalite|ready/i.test(String(i.status))).length

  if (loading && items.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="Atölye iş kuyruğu yükleniyor…" />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Top Stat Pills */}
      <View style={styles.stats}>
        <StatPill label="Açık İşler" value={openItems.length} tone="default" />
        <StatPill label="Onayda" value={waiting} tone="warning" />
        <StatPill label="İşlemde" value={inProgress} tone="default" />
        <StatPill label="QC / Hazır" value={ready} tone="success" />
      </View>

      {/* Filter Chips Horizontal Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {STATUS_FILTERS.map(f => (
          <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}

      {/* Card List with Touch-Optimized ServiceCardItem */}
      <FlatList
        data={active}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 96, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="wrench"
            title="Açık iş bulunamadı"
            subtitle="Filtreyi değiştirin veya yeni servis kabulü yapın"
            actionLabel="Yeni Kabul Al"
            onAction={() => router.push('/kabul')}
          />
        }
        renderItem={({ item }) => (
          <ServiceCardItem
            item={item}
            onPress={() => router.push(`/atolye/${item.id}`)}
            onQuickStatus={() => setSelectedOrder(item)}
          />
        )}
      />

      <FloatingActionButton
        icon="plus"
        label="Yeni Kabul"
        onPress={() => router.push('/kabul')}
        accessibilityLabel="Yeni Kabul Al"
      />

      {/* Quick Status Action Sheet from List Card */}
      {selectedOrder && (
        <StatusActionSheet
          visible={!!selectedOrder}
          currentStatus={selectedOrder.status || 'alindi'}
          onSelectStatus={s => void handleQuickStatusChange(s)}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  filters: { maxHeight: 48, marginTop: 10 },
})
