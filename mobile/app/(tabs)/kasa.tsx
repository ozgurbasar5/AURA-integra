import { useCallback, useRef, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock, StatPill } from '@/components/ui/States'
import { parseLocaleNumber } from '@/lib/parse-locale-number'

type Shift = {
  id: string
  status: string
  opening_balance: number
  closing_balance?: number | null
  opened_at: string
  closed_at?: string | null
  difference?: number | null
  expected_cash?: number | null
}

type EodReport = {
  meta?: { shop_name?: string }
  totals?: { sales?: number; cash?: number; card?: number; income?: number; expense?: number }
  summary?: Record<string, number>
}

export default function KasaScreen() {
  const { colors } = useAppTheme()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('0')
  const [closing, setClosing] = useState('0')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [report, setReport] = useState<EodReport | null>(null)
  const [reportShiftId, setReportShiftId] = useState<string | null>(null)
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/cash-shifts', { fresh }) as { items?: Shift[] }
      setShifts(json.items ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
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

  const openShift = shifts.find(s => s.status === 'open')
  const closed = shifts.filter(s => s.status !== 'open')
  const lastDiff = closed[0]?.difference

  async function open() {
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/cash-shifts', {
        method: 'POST',
        body: JSON.stringify({ action: 'open', opening_balance: Number(opening) || 0 }),
      })
      invalidateApiCache('/api/tenant/cash-shifts')
      await load(true, true)
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
      invalidateApiCache('/api/tenant/cash-shifts')
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kapatılamadı')
    } finally {
      setBusy(false)
    }
  }

  async function loadReport(shiftId: string) {
    setBusy(true)
    setError('')
    try {
      const json = await apiFetch(`/api/tenant/eod-report?shiftId=${shiftId}`, { fresh: true }) as {
        report?: EodReport
      }
      setReport(json.report ?? null)
      setReportShiftId(shiftId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Z raporu alınamadı')
    } finally {
      setBusy(false)
    }
  }

  async function submitAdjust() {
    const delta = parseLocaleNumber(adjustDelta)
    if (!Number.isFinite(delta) || delta === 0 || adjustReason.trim().length < 5) {
      setError('Geçerli tutar (örn. 50,5) ve en az 5 karakter neden gerekli')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch('/api/tenant/kasa/adjust', {
        method: 'POST',
        body: JSON.stringify({ delta, reason: adjustReason.trim() }),
      })
      setAdjustOpen(false)
      setAdjustDelta('')
      setAdjustReason('')
      await load(true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Düzeltme başarısız')
    } finally {
      setBusy(false)
    }
  }

  if (loading && shifts.length === 0) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Kasa yükleniyor…" /></View>
  }

  const totals = report?.totals || report?.summary

  async function shareReport() {
    if (!totals) return
    const lines = Object.entries(totals).slice(0, 12).map(([k, v]) =>
      `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? `${Number(v).toLocaleString('tr-TR')} ₺` : String(v)}`,
    )
    await Share.share({
      message: `Z raporu özeti\n${lines.join('\n')}`,
      title: 'Kasa Z raporu',
    })
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} tintColor={colors.primary} />}
    >
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}

      <View style={styles.stats}>
        <StatPill label="Durum" value={openShift ? 'Açık' : 'Kapalı'} tone={openShift ? 'success' : 'warning'} />
        <StatPill
          label="Son fark"
          value={lastDiff == null ? '—' : `${Number(lastDiff).toFixed(0)}₺`}
          tone={lastDiff != null && Number(lastDiff) < 0 ? 'danger' : 'default'}
        />
        <StatPill label="Kayıt" value={shifts.length} />
      </View>

      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Güncel vardiya</Text>
        {openShift ? (
          <>
            <Text style={{ fontWeight: '800', color: colors.success, fontSize: 15 }}>Vardiya açık</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Açılış: {Number(openShift.opening_balance).toFixed(2)} ₺ · {new Date(openShift.opened_at).toLocaleString('tr-TR')}
            </Text>
            <TextField label="Kapanış bakiyesi" keyboardType="decimal-pad" value={closing} onChangeText={setClosing} />
            <Button title="Kasayı Kapat" variant="danger" loading={busy} onPress={() => void close()} />
            <Button title="Z raporu (açık)" variant="secondary" loading={busy} onPress={() => void loadReport(openShift.id)} />
          </>
        ) : (
          <>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Satış ve tahsilat için önce vardiya açın</Text>
            <TextField label="Açılış bakiyesi" keyboardType="decimal-pad" value={opening} onChangeText={setOpening} />
            <Button title="Kasayı Aç" loading={busy} onPress={() => void open()} />
          </>
        )}
        <Button title="Kasa düzeltme" variant="ghost" onPress={() => setAdjustOpen(true)} />
      </Card>

      {report && reportShiftId ? (
        <Card>
          <SectionHeader title="Z raporu özeti" />
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
            Vardiya {reportShiftId.slice(0, 8)}…
          </Text>
          {totals ? (
            <View style={{ gap: 6 }}>
              {Object.entries(totals).slice(0, 8).map(([k, v]) => (
                <View key={k} style={styles.reportRow}>
                  <Text style={{ color: colors.muted, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</Text>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>
                    {typeof v === 'number' ? `${Number(v).toLocaleString('tr-TR')} ₺` : String(v)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted }}>Özet alanları yok — web’de detaylı rapor</Text>
          )}
          {totals ? (
            <Button title="Raporu paylaş" variant="secondary" onPress={() => void shareReport()} style={{ marginTop: 12 }} />
          ) : null}
        </Card>
      ) : null}

      <Text style={[styles.section, { color: colors.muted }]}>Son vardiyalar</Text>
      {shifts.length === 0 ? (
        <EmptyState icon="money" title="Vardiya geçmişi yok" subtitle="İlk vardiyayı açarak başlayın" />
      ) : (
        shifts.slice(0, 12).map(s => (
          <ListRow
            key={s.id}
            title={s.status === 'open' ? 'Açık vardiya' : 'Kapalı vardiya'}
            meta={`${new Date(s.opened_at).toLocaleString('tr-TR')}${s.difference != null ? ` · fark ${Number(s.difference).toFixed(0)} ₺` : ''}`}
            right={
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                {Number(s.closing_balance ?? s.opening_balance).toFixed(0)} ₺
              </Text>
            }
            onPress={() => void loadReport(s.id)}
            chevron
          />
        ))
      )}

      <FormModal
        visible={adjustOpen}
        title="Kasa düzeltme"
        onClose={() => setAdjustOpen(false)}
        footer={<Button title="Uygula" loading={busy} onPress={() => void submitAdjust()} />}
      >
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Pozitif delta kasayı artırır. Yalnızca sahip/yönetici.
        </Text>
        <TextField label="Delta (₺)" keyboardType="decimal-pad" value={adjustDelta} onChangeText={setAdjustDelta} placeholder="örn. -50 veya 100" />
        <TextField label="Neden" value={adjustReason} onChangeText={setAdjustReason} placeholder="En az 5 karakter" />
      </FormModal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between' },
})
