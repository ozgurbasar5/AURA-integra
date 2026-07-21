import { useCallback, useEffect, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { enqueueJob } from '@/lib/offline-queue'
import { showToast } from '@/lib/toast'
import { usePartsCatalog } from '@/lib/PartsCatalog'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { ModuleGuard } from '@/components/ModuleGuard'

type CountRow = {
  id: string
  name: string
  barcode: string | null
  stock_qty: number
  counted: string
}

export default function SayimScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = 72 + insets.bottom
  const catalog = usePartsCatalog()
  const [rows, setRows] = useState<CountRow[]>([])
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [scanOpen, setScanOpen] = useState(false)

  const syncRows = useCallback(() => {
    setRows(catalog.parts.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      stock_qty: p.stock_qty,
      counted: String(p.stock_qty),
    })))
  }, [catalog.parts])

  useFocusEffect(useCallback(() => {
    if (!profile?.tenant_id) {
      setError(profile ? 'Bayi hesabı bağlı değil' : 'Profil bekleniyor — yenileyin')
      return
    }
    void catalog.ensureLoaded().then(() => syncRows())
  }, [profile, profile?.tenant_id, catalog, syncRows]))

  useEffect(() => {
    if (catalog.parts.length) syncRows()
  }, [catalog.parts, syncRows])

  const filtered = rows.filter(r => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return r.name.toLowerCase().includes(s) || (r.barcode || '').includes(q.trim())
  })
  const diffCount = rows.filter(r => (parseInt(r.counted, 10) || 0) !== r.stock_qty).length

  function bump(id: string, delta: number) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const n = Math.max(0, (parseInt(r.counted, 10) || 0) + delta)
      return { ...r, counted: String(n) }
    }))
  }

  async function save() {
    const diffs = rows.filter(r => (parseInt(r.counted, 10) || 0) !== r.stock_qty)
    if (!diffs.length) {
      setMsg('Kaydedilecek fark yok')
      return
    }
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const payload = {
        notes: 'Mobil stok sayım',
        items: diffs.map(d => ({
          part_id: d.id,
          counted_qty: parseInt(d.counted, 10) || 0,
          expected_qty: d.stock_qty,
        })),
      }
      await apiFetch('/api/tenant/stock/count', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setMsg(`${diffs.length} kalem sunucuda güncellendi`)
      catalog.invalidate()
      await catalog.refresh()
      syncRows()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Kayıt başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message)) {
        const payload = {
          notes: 'Mobil stok sayım',
          items: diffs.map(d => ({
            part_id: d.id,
            counted_qty: parseInt(d.counted, 10) || 0,
            expected_qty: d.stock_qty,
          })),
        }
        await enqueueJob({
          path: '/api/tenant/stock/count',
          method: 'POST',
          body: payload,
          label: 'Stok sayım',
        })
        setMsg(`${diffs.length} kalem kuyruğa alındı`)
        showToast('Sayım çevrimdışı kuyruğa alındı', 'info')
      } else {
        setError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModuleGuard tab="sayim">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <SearchBar placeholder="Parça / barkod" value={q} onChangeText={setQ} />
        </View>
        <Pressable style={[styles.scanBtn, { backgroundColor: colors.primaryDark }]} onPress={() => setScanOpen(true)}>
          <Text style={styles.scanBtnText}>Tara</Text>
        </Pressable>
      </View>
      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          setQ(data)
          setRows(prev => prev.map(r => {
            if ((r.barcode || '') !== data) return r
            const n = (parseInt(r.counted, 10) || 0) + 1
            return { ...r, counted: String(n) }
          }))
        }}
      />
      {error || catalog.error ? (
        <ErrorBanner message={error || catalog.error || ''} onRetry={() => void catalog.refresh()} />
      ) : null}
      {msg ? <Text style={{ color: colors.success, paddingHorizontal: 16, marginTop: 8 }}>{msg}</Text> : null}
      {catalog.loading && rows.length === 0 ? (
        <LoadingBlock label="Sayım listesi…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={catalog.refreshing} onRefresh={() => void catalog.refresh()} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: bottomPad + 64, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState icon="check-square-o" title="Sayılacak stok yok" subtitle="Önce stok / alış girin" />
          }
          renderItem={({ item }) => {
            const counted = parseInt(item.counted, 10) || 0
            const diff = counted - item.stock_qty
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{item.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Beklenen: {item.stock_qty} · {item.barcode || '—'}</Text>
                <View style={styles.controls}>
                  <Pressable style={[styles.bump, { backgroundColor: colors.bgElevated }]} onPress={() => bump(item.id, -1)}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>−</Text>
                  </Pressable>
                  <TextField
                    keyboardType="number-pad"
                    value={item.counted}
                    onChangeText={t => setRows(prev => prev.map(r => r.id === item.id ? { ...r, counted: t } : r))}
                    style={[styles.count, { minHeight: 44 }]}
                  />
                  <Pressable style={[styles.bump, { backgroundColor: colors.primarySoft }]} onPress={() => bump(item.id, 1)}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary }}>+</Text>
                  </Pressable>
                  <Text style={{ marginLeft: 'auto', fontWeight: '700', color: diff !== 0 ? colors.warning : colors.muted }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </Text>
                </View>
              </View>
            )
          }}
        />
      )}

      <View style={[styles.saveWrap, { bottom: bottomPad }]}>
        <Button
          title={saving ? '…' : `Sayımı Kaydet${diffCount ? ` · ${diffCount} fark` : ''}`}
          loading={saving}
          onPress={() => void save()}
        />
      </View>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: 16, paddingBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  scanBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  card: { padding: 14, borderWidth: StyleSheet.hairlineWidth },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  bump: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  count: { width: 64, height: 44, borderWidth: 1, borderRadius: 12, textAlign: 'center', fontWeight: '800' },
  saveWrap: { position: 'absolute', left: 12, right: 12, bottom: 12 },
})
