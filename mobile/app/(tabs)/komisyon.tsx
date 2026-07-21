import { useCallback, useRef, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ListRow } from '@/components/ui/ListRow'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Row = {
  name?: string
  technician?: string
  total?: number
  amount?: number
  commission?: number
  sales_total?: number
  service_total?: number
}

export default function KomisyonScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/commissions', { fresh }) as {
        items?: Row[]
        commissions?: Row[]
        technicians?: Row[]
      }
      setItems(json.items ?? json.commissions ?? json.technicians ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Komisyon yüklenemedi')
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

  if (loading && !items.length) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Komisyon…" /></View>
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      <FlatList
        data={items}
        keyExtractor={(i, idx) => `${i.name || i.technician || idx}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="pie-chart" title="Komisyon verisi yok" subtitle="Bu ay teslim / satış yok" />}
        renderItem={({ item }) => {
          const name = item.name || item.technician || 'Personel'
          const amt = Number(item.commission ?? item.amount ?? item.total) || 0
          return (
            <ListRow
              title={name}
              subtitle={
                item.sales_total != null || item.service_total != null
                  ? `Satış ${Number(item.sales_total || 0).toLocaleString('tr-TR')} · Servis ${Number(item.service_total || 0).toLocaleString('tr-TR')}`
                  : undefined
              }
              right={
                <Text style={{ color: colors.primary, fontWeight: '900' }}>
                  {amt.toLocaleString('tr-TR')} ₺
                </Text>
              }
            />
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
