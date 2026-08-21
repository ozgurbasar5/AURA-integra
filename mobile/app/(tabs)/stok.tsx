import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@/lib/auth'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { usePartsCatalog, type CatalogPart } from '@/lib/PartsCatalog'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FormModal } from '@/components/ui/FormModal'
import { SearchBar } from '@/components/ui/SearchBar'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'

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
  const [edit, setEdit] = useState<CatalogPart | null>(null)
  const [delta, setDelta] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scanOpen, setScanOpen] = useState(false)

  const transfers = useApiQuery<Transfer[]>(
    view === 'transferler' ? '/api/tenant/stock/transfer' : null,
    json => (json as { items?: Transfer[] }).items ?? [],
    { enabled: view === 'transferler' },
  )

  useFocusEffect(
    useCallback(() => {
      if (profile?.tenant_id) void catalog.ensureLoaded()
    }, [profile?.tenant_id, catalog]),
  )

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

  async function applyDelta(customDelta?: number) {
    if (!edit) return
    const d = customDelta !== undefined ? customDelta : Number(delta)
    if (!Number.isFinite(d) || d === 0) {
      setError('Stok değişim miktarı sıfır olamaz')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/parts', {
        method: 'PATCH',
        body: JSON.stringify({ id: edit.id, delta: d }),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="Stok listesi yükleniyor…" />
      </View>
    )
  }

  return (
    <ModuleGuard tab="stok">
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Filter & Barcode Search Bar */}
        <View style={[styles.headerControls, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.chips}>
            <Chip label="Parçalar" active={view === 'parcalar'} onPress={() => setView('parcalar')} />
            <Chip label="Transferler" active={view === 'transferler'} onPress={() => setView('transferler')} />
          </View>
          {view === 'parcalar' ? (
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <SearchBar value={q} onChangeText={setQ} placeholder="Parça veya barkod ara…" />
              </View>
              <Pressable
                style={[styles.scanBtn, { backgroundColor: colors.primaryDark }]}
                onPress={() => setScanOpen(true)}
                accessibilityLabel="Barkod Tara"
              >
                <FontAwesome name="barcode" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : null}
          {view === 'parcalar' ? (
            <Chip
              label={lowOnly ? '⚠️ Kritik Stok (Filtrelendi)' : 'Kritik Stokları Göster'}
              active={lowOnly}
              tone={lowOnly ? 'warning' : 'default'}
              onPress={() => setLowOnly(v => !v)}
            />
          ) : null}
        </View>

        {view === 'parcalar' ? (
          <>
            {error ? <ErrorBanner message={error} onRetry={() => void catalog.refresh()} /> : null}
            <FlatList
              data={list}
              keyExtractor={i => i.id}
              refreshControl={<RefreshControl refreshing={catalog.refreshing} onRefresh={() => void catalog.refresh()} />}
              contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1, paddingBottom: 80 }}
              ListEmptyComponent={<EmptyState icon="cubes" title="Stok bulunamadı" subtitle="Aramayı değiştirin veya yeni parça ekleyin" />}
              renderItem={({ item }) => {
                const low = item.stock_qty <= (item.min_stock ?? 2)
                const outOfStock = item.stock_qty <= 0
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.partCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: low ? colors.warning : colors.border,
                        borderRadius: colors.radiusLg,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                    onPress={() => {
                      setEdit(item)
                      setDelta('0')
                    }}
                  >
                    <View style={[styles.partIconBox, { backgroundColor: low ? colors.warningSoft : colors.primarySoft }]}>
                      <FontAwesome name="cube" size={18} color={low ? colors.warning : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.partSub, { color: colors.muted }]}>
                        {item.barcode || item.brand || 'Barkodsuz'} · Min: {item.min_stock ?? 0}
                      </Text>
                    </View>
                    <View style={styles.stockCountWrap}>
                      <Text
                        style={[
                          styles.stockCountText,
                          { color: outOfStock ? colors.danger : low ? colors.warning : colors.primary },
                        ]}
                      >
                        {item.stock_qty}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>ADET</Text>
                    </View>
                  </Pressable>
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
                contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1 }}
                ListHeaderComponent={
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                    Şubeler arası son transferler. Yeni transfer web panelinden oluşturulur.
                  </Text>
                }
                ListEmptyComponent={<EmptyState icon="exchange" title="Transfer yok" subtitle="Şubeler arası transfer kaydı bulunmuyor" />}
                renderItem={({ item }) => (
                  <View style={[styles.partCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
                    <View style={[styles.partIconBox, { backgroundColor: colors.primarySoft }]}>
                      <FontAwesome name="exchange" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partTitle, { color: colors.text }]}>{item.part?.name || 'Parça'}</Text>
                      <Text style={[styles.partSub, { color: colors.muted }]}>
                        {item.from_branch?.name || '—'} → {item.to_branch?.name || '—'}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 16 }}>{item.qty}</Text>
                  </View>
                )}
              />
            )}
          </>
        )}

        {/* 1-Tap Quick Stock Adjuster FormModal */}
        <FormModal
          visible={!!edit}
          title={edit?.name || 'Stok Güncelle'}
          onClose={() => setEdit(null)}
          footer={<Button title="Stoku Güncelle" loading={busy} onPress={() => void applyDelta()} style={{ minHeight: 52 }} />}
        >
          <View style={[styles.stockStatusBanner, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Mevcut Depo Stoğu</Text>
            <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '900' }}>
              {edit?.stock_qty} Adet
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>HIZLI MİKTAR DEĞİŞİMİ (+ / -)</Text>
          <View style={styles.quickDeltaRow}>
            {[-5, -1, 1, 5, 10].map(val => (
              <Pressable
                key={val}
                style={[
                  styles.quickDeltaBtn,
                  {
                    backgroundColor: val > 0 ? colors.primarySoft : colors.dangerSoft,
                    borderColor: val > 0 ? colors.primary : colors.danger,
                  },
                ]}
                onPress={() => void applyDelta(val)}
                disabled={busy}
              >
                <Text
                  style={{
                    color: val > 0 ? colors.primary : colors.danger,
                    fontWeight: '900',
                    fontSize: 14,
                  }}
                >
                  {val > 0 ? `+${val}` : `${val}`}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField
            label="Manuel Değişim Miktarı (örn. +10 veya -3)"
            keyboardType="numbers-and-punctuation"
            value={delta}
            onChangeText={setDelta}
            placeholder="0"
          />
        </FormModal>

        <BarcodeScannerModal
          visible={scanOpen}
          onClose={() => setScanOpen(false)}
          onScan={data => {
            setQ(data)
            const hit = catalog.findByBarcode(data)
            if (hit) {
              setEdit(hit)
              setDelta('0')
            }
          }}
        />
      </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerControls: { padding: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
    minHeight: 64,
  },
  partIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partTitle: { fontSize: 15, fontWeight: '800' },
  partSub: { fontSize: 12, marginTop: 2 },
  stockCountWrap: { alignItems: 'flex-end' },
  stockCountText: { fontSize: 18, fontWeight: '900' },
  stockStatusBanner: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 },
  quickDeltaRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginBottom: 8 },
  quickDeltaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
  },
})
