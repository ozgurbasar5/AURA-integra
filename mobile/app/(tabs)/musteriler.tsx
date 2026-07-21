import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ListRow } from '@/components/ui/ListRow'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Customer = {
  id: string
  name?: string
  full_name?: string
  phone?: string
  email?: string
  segment?: string
}

export default function MusterilerScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/customers', { fresh }) as { items?: Customer[]; customers?: Customer[] }
      setItems(json.items ?? json.customers ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Müşteriler yüklenemedi')
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items.slice(0, 100)
    return items.filter(c => {
      const name = (c.name || c.full_name || '').toLowerCase()
      return name.includes(s) || (c.phone || '').includes(s)
    }).slice(0, 100)
  }, [items, q])

  if (loading && !items.length) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Müşteriler…" /></View>
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ padding: 16, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="İsim veya telefon…" />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="address-book" title="Müşteri yok" />}
        renderItem={({ item }) => {
          const name = item.name || item.full_name || 'Müşteri'
          return (
            <ListRow
              title={name}
              subtitle={item.phone}
              meta={item.email || item.segment}
              chevron
              onPress={() => {
                if (item.phone) router.push({ pathname: '/kabul', params: { phone: item.phone } } as never)
              }}
            />
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
