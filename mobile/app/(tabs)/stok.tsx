import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { usePartsCatalog } from '@/lib/PartsCatalog'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { SearchBar } from '@/components/ui/SearchBar'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type BranchRef = { id: string; name: string } | null

type Transfer = {
  id: string
  qty: number
  note: string | null
  created_at: string
  from_branch: BranchRef
  to_branch: BranchRef
  part: { id: string; name: string } | null
}

export default function StokScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const catalog = usePartsCatalog()
  const [view, setView] = useState<'parcalar' | 'transferler'>('parcalar')
  const [q, setQ] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [edit, setEdit] = useState<{ id: string; name: string; stock_qty: number } | null>(null)
  const [delta, setDelta] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const transfers = useApiQuery<Transfer[]>(
    view === 'transferler' ? '/api/tenant/stock/transfer' : null,
    json => ((json as { items?: Transfer[] }).items ?? []),
    { enabled: view === 'transferler' },
  )

  useFocusEffect(useCallback(() => {
    if (profile?.tenant_id) void catalog.ensureLoaded()
  }, [profile?.tenant_id, catalog]))

  useEffect(() => {
    if (catalog.error) setError(catalog.error)
  }, [catalog.error])

  const list = useMemo(() => {
    let items = catalog.filter(q, { limit: 120 })
    if (lowOnly) {
      items = items.filter(p => p.stock_qty <= (p.min_stock ?? 2))
    }
    return items
  }, [catalog, q, lowOnly])

  async function applyDelta() {
    if (!edit) return
    const d = Number(delta)
    if (!Number.isFinite(d) || d === 0) {
      setError('Delta sıfır olamaz')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/parts', {
        method: 'PATCH',
        body: JSON.stringify({ id: edit.id, delta: d }),
      })
      catalog.invalidate()
      invalidateApiCache('/api/tenant/parts')
      await catalog.refresh()
      setEdit(null)
      setDelta('0')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  if (view === 'parcalar' && catalog.loading && catalog.parts.length === 0) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Stok yükleniyor…" /></View>
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ padding: 16, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card }}>
        <View style={styles.chips}>
          <Chip label="Parçalar" active={view === 'parcalar'} onPress={() => setView('parcalar')} />
          <Chip label="Transferler" active={view === 'transferler'} onPress={() => setView('transferler')} />
        </View>
        {view === 'parcalar' ? (
          <>
            <SearchBar value={q} onChangeText={setQ} placeholder="Parça ara…" />
            <Chip label={lowOnly ? 'Düşük stok ✓' : 'Düşük stok'} active={lowOnly} onPress={() => setLowOnly(v => !v)} />
          </>
        ) : null}
      </View>

      {view === 'parcalar' ? (
        <>
          {error ? <ErrorBanner message={error} onRetry={() => void catalog.refresh()} /> : null}
          <FlatList
            data={list}
            keyExtractor={i => i.id}
            refreshControl={<RefreshControl refreshing={catalog.refreshing} onRefresh={() => void catalog.refresh()} />}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListEmptyComponent={<EmptyState icon="cubes" title="Stok yok" subtitle="Alış veya tedarik ile giriş yapın" />}
            renderItem={({ item }) => {
              const low = item.stock_qty <= (item.min_stock ?? 2)
              return (
                <ListRow
                  title={item.name}
                  subtitle={item.barcode || item.brand || undefined}
                  meta={`Min ${item.min_stock ?? 0}`}
                  right={
                    <Text style={{ fontWeight: '900', color: low ? colors.warning : colors.primary, fontSize: 16 }}>
                      {item.stock_qty}
                    </Text>
                  }
                  onPress={() => { setEdit({ id: item.id, name: item.name, stock_qty: item.stock_qty }); setDelta('0') }}
                  chevron
                />
              )
            }}
          />
        </>
      ) : (
        <>
          {transfers.error ? <ErrorBanner message={transfers.error} onRetry={() => void transfers.refresh()} /> : null}
          {transfers.loading && !transfers.data ? (
            <LoadingBlock label="Transferler yükleniyor…" />
          ) : (
            <FlatList
              data={transfers.data ?? []}
              keyExtractor={i => i.id}
              refreshControl={<RefreshControl refreshing={transfers.refreshing} onRefresh={() => void transfers.refresh()} tintColor={colors.primary} />}
              contentContainerStyle={{ padding: 16, flexGrow: 1 }}
              ListHeaderComponent={
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                  Şubeler arası son transferler. Yeni transfer web panelinden oluşturulur.
                </Text>
              }
              ListEmptyComponent={<EmptyState icon="exchange" title="Transfer yok" subtitle="Şubeler arası transfer kaydı bulunmuyor" />}
              renderItem={({ item }) => (
                <ListRow
                  icon="exchange"
                  title={item.part?.name || 'Parça'}
                  subtitle={`${item.from_branch?.name || '—'} → ${item.to_branch?.name || '—'}`}
                  meta={`${new Date(item.created_at).toLocaleDateString('tr-TR')}${item.note ? ` · ${item.note}` : ''}`}
                  right={
                    <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 16 }}>
                      {item.qty}
                    </Text>
                  }
                />
              )}
            />
          )}
        </>
      )}

      <FormModal
        visible={!!edit}
        title={edit?.name || 'Stok'}
        onClose={() => setEdit(null)}
        footer={<Button title="Uygula" loading={busy} onPress={() => void applyDelta()} />}
      >
        <Text style={{ color: colors.muted }}>Mevcut: {edit?.stock_qty}</Text>
        <TextField
          label="Delta (+/−)"
          keyboardType="numbers-and-punctuation"
          value={delta}
          onChangeText={setDelta}
          placeholder="örn. -2 veya 5"
        />
      </FormModal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
