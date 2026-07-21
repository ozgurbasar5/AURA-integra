import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { useApiQuery } from '@/lib/useApiQuery'
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
  const [q, setQ] = useState('')

  const { data: items, error, loading, refreshing, refresh } = useApiQuery<Customer[]>(
    '/api/tenant/customers',
    json => {
      const j = json as { items?: Customer[]; customers?: Customer[] }
      return j.items ?? j.customers ?? []
    },
  )

  const filtered = useMemo(() => {
    const list = items ?? []
    const s = q.trim().toLowerCase()
    if (!s) return list.slice(0, 100)
    return list.filter(c => {
      const name = (c.name || c.full_name || '').toLowerCase()
      return name.includes(s) || (c.phone || '').includes(s)
    }).slice(0, 100)
  }, [items, q])

  if (loading && !items?.length) {
    return (
      <ModuleGuard tab="musteriler">
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <LoadingBlock label="Müşteriler…" />
        </View>
      </ModuleGuard>
    )
  }

  return (
    <ModuleGuard tab="musteriler">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ padding: 16, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="İsim veya telefon…" />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void refresh()} /> : null}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="address-book" title="Müşteri yok" />}
        renderItem={({ item }) => {
          const name = item.name || item.full_name || 'Müşteri'
          return (
            <ListRow
              title={name}
              subtitle={item.phone || 'Telefon yok — manuel kabul'}
              meta={item.email || item.segment}
              chevron={!!item.phone}
              onPress={() => {
                if (!item.phone) return
                router.push({
                  pathname: '/kabul',
                  params: { phone: item.phone, name },
                } as never)
              }}
            />
          )
        }}
      />
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
