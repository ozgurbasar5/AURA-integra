import { useCallback, useRef, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState, ErrorBanner, LoadingBlock, StatPill } from '@/components/ui/States'

type ReportPayload = {
  finance?: { income?: number; expense?: number; net?: number }
  sales?: { count?: number; total?: number }
  stock?: { low?: number; value?: number }
  summary?: Record<string, number>
  vat?: { collected?: number; paid?: number }
}

export default function RaporlarScreen() {
  const { colors } = useAppTheme()
  const [data, setData] = useState<ReportPayload | null>(null)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const hasData = useRef(false)

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const [rep, st] = await Promise.all([
        apiFetch('/api/tenant/reports', { fresh }).catch(() => null) as Promise<ReportPayload | null>,
        apiFetch('/api/tenant/stats', { fresh }) as Promise<{ stats?: Record<string, unknown> }>,
      ])
      setData(rep)
      setStats(st.stats ?? null)
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rapor yüklenemedi')
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

  if (loading && !hasData.current) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Raporlar…" /></View>
  }

  const fin = data?.finance
  const sales = data?.sales

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
    >
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}

      <SectionHeader title="Bugün" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatPill label="Açık iş" value={Number(stats?.active_orders) || 0} />
        <StatPill label="Satış" value={stats?.today_sales != null ? `${Math.round(Number(stats.today_sales)).toLocaleString('tr-TR')}₺` : '—'} tone="success" />
        <StatPill label="Düşük stok" value={Number(stats?.low_stock) || 0} tone="warning" />
      </View>

      {fin || sales ? (
        <Card>
          <Text style={[styles.h, { color: colors.text }]}>Dönem özeti</Text>
          {fin ? (
            <>
              <Row label="Gelir" value={fin.income} colors={colors} />
              <Row label="Gider" value={fin.expense} colors={colors} />
              <Row label="Net" value={fin.net} colors={colors} bold />
            </>
          ) : null}
          {sales ? (
            <>
              <Row label="Satış adedi" value={sales.count} colors={colors} raw />
              <Row label="Satış tutarı" value={sales.total} colors={colors} />
            </>
          ) : null}
        </Card>
      ) : (
        <EmptyState
          icon="bar-chart"
          title="Detaylı rapor yok"
          subtitle="Plan seviyeniz veya API yanıtı sınırlı — günlük özet yukarıda"
        />
      )}

      {data?.vat ? (
        <Card>
          <Text style={[styles.h, { color: colors.text }]}>KDV</Text>
          <Row label="Tahsil" value={data.vat.collected} colors={colors} />
          <Row label="Ödenen" value={data.vat.paid} colors={colors} />
        </Card>
      ) : null}
    </ScrollView>
  )
}

function Row({
  label,
  value,
  colors,
  bold,
  raw,
}: {
  label: string
  value?: number
  colors: { text: string; muted: string }
  bold?: boolean
  raw?: boolean
}) {
  return (
    <ModuleGuard tab="raporlar">
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: bold ? '900' : '700' }}>
        {value == null ? '—' : raw ? String(value) : `${Number(value).toLocaleString('tr-TR')} ₺`}
      </Text>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  h: { fontWeight: '800', fontSize: 15, marginBottom: 8 },
})
