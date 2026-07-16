import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { AuraColors } from '@/constants/AuraColors'

type Shift = {
  id: string
  status: string
  opening_balance: number
  closing_balance?: number | null
  opened_at: string
  closed_at?: string | null
  difference?: number | null
}

export default function KasaScreen() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('0')
  const [closing, setClosing] = useState('0')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const json = await apiFetch('/api/tenant/cash-shifts') as { items?: Shift[] }
      setShifts(json.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const openShift = shifts.find(s => s.status === 'open')

  async function open() {
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/cash-shifts', {
        method: 'POST',
        body: JSON.stringify({ action: 'open', opening_balance: Number(opening) || 0 }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Açılamadı')
    } finally {
      setBusy(false)
    }
  }

  async function close() {
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/cash-shifts', {
        method: 'POST',
        body: JSON.stringify({ action: 'close', closing_balance: Number(closing) || 0 }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kapatılamadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.title}>Güncel vardiya</Text>
        {openShift ? (
          <>
            <Text style={styles.ok}>Açık</Text>
            <Text style={styles.meta}>Açılış: {Number(openShift.opening_balance).toFixed(2)} ₺</Text>
            <Text style={styles.meta}>{new Date(openShift.opened_at).toLocaleString('tr-TR')}</Text>
            <Text style={styles.label}>Kapanış bakiyesi</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={closing}
              onChangeText={setClosing}
            />
            <Pressable style={styles.btnDanger} onPress={() => void close()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Kasayı Kapat</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.meta}>Açık vardiya yok</Text>
            <Text style={styles.label}>Açılış bakiyesi</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={opening}
              onChangeText={setOpening}
            />
            <Pressable style={styles.btn} onPress={() => void open()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Kasayı Aç</Text>}
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.section}>Son vardiyalar</Text>
      {shifts.slice(0, 10).map(s => (
        <View key={s.id} style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{s.status === 'open' ? 'Açık' : 'Kapalı'}</Text>
            <Text style={styles.meta}>{new Date(s.opened_at).toLocaleDateString('tr-TR')}</Text>
          </View>
          <Text style={styles.rowAmt}>
            {Number(s.closing_balance ?? s.opening_balance).toFixed(0)} ₺
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  error: { color: AuraColors.danger },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 8,
  },
  title: { fontWeight: '900', fontSize: 18, color: AuraColors.text },
  ok: { color: AuraColors.success, fontWeight: '800' },
  meta: { color: AuraColors.muted, fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', color: AuraColors.muted, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    fontWeight: '700',
  },
  btn: {
    marginTop: 8,
    backgroundColor: AuraColors.primary,
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: {
    marginTop: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
  section: { fontWeight: '800', color: AuraColors.text, marginTop: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AuraColors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  rowTitle: { fontWeight: '700', color: AuraColors.text },
  rowAmt: { fontWeight: '800', color: AuraColors.primary },
})
