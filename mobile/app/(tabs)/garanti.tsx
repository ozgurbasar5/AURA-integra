import { useCallback, useRef, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Chip } from '@/components/ui/Chip'
import { ListRow } from '@/components/ui/ListRow'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Warranty = {
  id: string
  customer_name?: string
  device_brand?: string
  device_model?: string
  status?: string
  claim_status?: string
  end_date?: string
  imei?: string
  order_no?: string
}

const CLAIM_STATUSES = ['acik', 'inceleniyor', 'onaylandi', 'reddedildi', 'kapandi']

export default function GarantiScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Warranty[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/warranties', { fresh }) as { items?: Warranty[] }
      setItems(json.items ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Garanti yüklenemedi')
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

  async function setClaim(id: string, claim_status: string) {
    setBusy(id)
    setError('')
    try {
      await apiFetch('/api/tenant/warranties', {
        method: 'PATCH',
        body: JSON.stringify({ id, claim_status }),
      })
      invalidateApiCache('/api/tenant/warranties')
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setBusy(null)
    }
  }

  if (loading && !items.length) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Garanti…" /></View>
  }

  return (
    <ModuleGuard tab="garanti">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="shield" title="Garanti kaydı yok" />}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 8 }}>
            <ListRow
              title={`${item.device_brand || ''} ${item.device_model || ''}`.trim() || 'Cihaz'}
              subtitle={item.customer_name}
              meta={`${item.status || ''} · bitiş ${item.end_date || '—'} · ${item.claim_status || '—'}`}
            />
            <View style={styles.chips}>
              {CLAIM_STATUSES.map(s => (
                <Chip
                  key={s}
                  label={s}
                  active={item.claim_status === s}
                  onPress={() => void setClaim(item.id, s)}
                  disabled={busy === item.id}
                />
              ))}
            </View>
          </View>
        )}
      />
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4, marginBottom: 8 },
})
