import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { AuraColors } from '@/constants/AuraColors'

type Part = {
  id: string
  name: string
  barcode: string | null
  stock_qty: number
}

type CountRow = Part & { counted: string }

export default function SayimScreen() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<CountRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [scanOpen, setScanOpen] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return
    setLoading(true)
    setError('')
    try {
      const json = await apiFetch('/api/tenant/parts') as { items?: Part[] }
      const items = json.items ?? []
      setRows(items.map(p => ({ ...p, counted: String(p.stock_qty) })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const filtered = rows.filter(r => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return r.name.toLowerCase().includes(s) || (r.barcode || '').includes(q.trim())
  })

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
      await apiFetch('/api/tenant/stock/count', {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Mobil stok sayım',
          items: diffs.map(d => ({
            part_id: d.id,
            counted_qty: parseInt(d.counted, 10) || 0,
            expected_qty: d.stock_qty,
          })),
        }),
      })
      setMsg(`${diffs.length} kalem sunucuda güncellendi`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.search, { flex: 1 }]}
          placeholder="Parça / barkod"
          placeholderTextColor={AuraColors.muted}
          value={q}
          onChangeText={setQ}
        />
        <Pressable style={styles.scanBtn} onPress={() => setScanOpen(true)}>
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {msg ? <Text style={styles.ok}>{msg}</Text> : null}
      {loading && rows.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={AuraColors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const counted = parseInt(item.counted, 10) || 0
            const diff = counted - item.stock_qty
            return (
              <View style={styles.card}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.meta}>Beklenen: {item.stock_qty} · {item.barcode || '—'}</Text>
                <View style={styles.controls}>
                  <Pressable style={styles.bump} onPress={() => bump(item.id, -1)}>
                    <Text style={styles.bumpText}>−</Text>
                  </Pressable>
                  <TextInput
                    style={styles.count}
                    keyboardType="number-pad"
                    value={item.counted}
                    onChangeText={t => setRows(prev => prev.map(r => r.id === item.id ? { ...r, counted: t } : r))}
                  />
                  <Pressable style={[styles.bump, styles.bumpPlus]} onPress={() => bump(item.id, 1)}>
                    <Text style={[styles.bumpText, { color: AuraColors.primary }]}>+</Text>
                  </Pressable>
                  <Text style={[styles.diff, diff !== 0 && styles.diffWarn]}>
                    {diff > 0 ? `+${diff}` : diff}
                  </Text>
                </View>
              </View>
            )
          }}
        />
      )}

      <Pressable style={styles.save} onPress={() => void save()} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Sayımı Kaydet</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  searchWrap: { padding: 16, paddingBottom: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: {
    backgroundColor: AuraColors.card,
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scanBtn: {
    backgroundColor: AuraColors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  error: { color: AuraColors.danger, paddingHorizontal: 16, marginTop: 8 },
  ok: { color: AuraColors.success, paddingHorizontal: 16, marginTop: 8 },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  title: { fontWeight: '700', color: AuraColors.text },
  meta: { color: AuraColors.muted, fontSize: 12, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  bump: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bumpPlus: { backgroundColor: '#e0f2fe' },
  bumpText: { fontSize: 22, fontWeight: '700', color: AuraColors.text },
  count: {
    width: 64,
    height: 44,
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    textAlign: 'center',
    fontWeight: '800',
  },
  diff: { marginLeft: 'auto', color: AuraColors.muted, fontWeight: '700' },
  diffWarn: { color: '#d97706' },
  save: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: AuraColors.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800' },
})
