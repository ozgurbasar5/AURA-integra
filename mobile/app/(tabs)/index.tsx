import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/lib/auth'
import { useTenant } from '@/lib/TenantContext'
import { apiFetch, checkApiHealth, invalidateApiCache } from '@/lib/api'
import { listQueuedJobs, flushQueue } from '@/lib/offline-queue'
import { getModulesForRole } from '@/lib/role-tabs'
import { registerForPushNotifications } from '@/lib/push'
import { useAppTheme } from '@/lib/ThemeContext'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ErrorBanner, Skeleton, StatPill } from '@/components/ui/States'

export default function HomeScreen() {
  const { profile, user, signOut } = useAuth()
  const { me } = useTenant()
  const { colors, appearance } = useAppTheme()
  const router = useRouter()
  const role = profile?.role
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [deliveredToday, setDeliveredToday] = useState<number | null>(null)
  const [todaySales, setTodaySales] = useState<number | null>(null)
  const [lowStock, setLowStock] = useState<number | null>(null)
  const [openShift, setOpenShift] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [netHint, setNetHint] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [flushing, setFlushing] = useState(false)
  const hasStats = useRef(false)

  const loadStats = useCallback(async (fresh = false) => {
    if (!profile?.tenant_id) {
      setLoading(false)
      if (!profile) setNetHint('Profil yükleniyor veya eksik — bekleyin / tekrar giriş')
      return
    }
    if (!hasStats.current) setLoading(true)
    try {
      const queued = listQueuedJobs()
      const statsP = apiFetch('/api/tenant/stats', { fresh }) as Promise<{
        stats?: {
          active_orders?: number
          ready_orders?: number
          today_sales?: number
          low_stock?: number
          open_shift?: boolean
        }
      }>
      // Health yalnızca hata / ilk yüklemede force değil — 60s cache
      const healthP = checkApiHealth(false)

      const [queue, statsRes, health] = await Promise.all([
        queued,
        statsP.catch((e: unknown) => ({ __err: e })),
        healthP,
      ])
      setQueueCount(queue.length)

      if (!health.ok && health.hint) setNetHint(health.hint)

      if ('__err' in (statsRes as object)) {
        const e = (statsRes as { __err: unknown }).__err
        const msg = e instanceof Error ? e.message : 'Veri yüklenemedi'
        if (!hasStats.current) {
          setOpenCount(null)
          setDeliveredToday(null)
          setTodaySales(null)
          setLowStock(null)
        }
        if (/404/.test(msg)) setNetHint('Sunucu güncel değil (API 404).')
        else if (/401|403/.test(msg)) setNetHint('Oturum geçersiz — tekrar giriş yapın.')
        else setNetHint(msg)
      } else {
        const s = (statsRes as { stats?: Record<string, unknown> }).stats ?? {}
        setOpenCount(Number(s.active_orders) || 0)
        setDeliveredToday(Number(s.ready_orders) || 0)
        setTodaySales(Number(s.today_sales) || 0)
        setLowStock(Number(s.low_stock) || 0)
        setOpenShift(!!s.open_shift)
        hasStats.current = true
        if (health.ok) setNetHint(null)
      }
    } catch {
      setQueueCount((await listQueuedJobs()).length)
      if (!hasStats.current) setNetHint('Sunucuya ulaşılamadı')
    } finally {
      setLoading(false)
    }
  }, [profile, profile?.tenant_id])

  useFocusEffect(useCallback(() => {
    void (async () => {
      if (!hasStats.current) await loadStats(false)
      else await loadStats(true)
    })()
  }, [loadStats]))

  useFocusEffect(useCallback(() => {
    if (profile?.tenant_id) void registerForPushNotifications().catch(() => {})
  }, [profile?.tenant_id]))

  async function handleFlushQueue() {
    setFlushing(true)
    try {
      await flushQueue()
      setQueueCount((await listQueuedJobs()).length)
      invalidateApiCache('/api/tenant/stats')
      await loadStats(true)
    } finally {
      setFlushing(false)
    }
  }

  const modules = getModulesForRole(role)
  const firstName = (me?.full_name || profile?.full_name || '').split(' ')[0]
  const shop = me?.shop_name || me?.company_name
  const cols = appearance.homeColumns
  const cardWidth = cols === 3 ? '31%' : '48%' as const

  return (
    <Screen scroll>
      <View style={[styles.hero, { backgroundColor: colors.primaryDark, borderRadius: colors.radiusLg }]}>
        <Text style={styles.brand}>AURA İntegra</Text>
        <Text style={styles.h1}>Merhaba{firstName ? `, ${firstName}` : ''}</Text>
        <Text style={styles.muted}>
          {[shop, user?.email].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.heroActions}>
          <Pressable
            style={styles.heroChip}
            onPress={() => { invalidateApiCache(); void loadStats(true) }}
          >
            <FontAwesome name="refresh" size={12} color="#fff" />
            <Text style={styles.heroChipText}>Yenile</Text>
          </Pressable>
          <Pressable style={styles.heroChip} onPress={() => router.push('/yenilikler' as never)}>
            <FontAwesome name="magic" size={12} color="#fff" />
            <Text style={styles.heroChipText}>Yenilikler</Text>
          </Pressable>
          <Pressable style={styles.heroChip} onPress={() => router.push('/gorunum' as never)}>
            <FontAwesome name="sliders" size={12} color="#fff" />
            <Text style={styles.heroChipText}>Görünüm</Text>
          </Pressable>
        </View>
      </View>

      {netHint ? <ErrorBanner message={netHint} onRetry={() => void loadStats(true)} /> : null}

      {queueCount > 0 ? (
        <Card style={styles.queueRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.text, fontSize: 14 }}>
              Çevrimdışı kuyruk
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              {queueCount} işlem bekliyor — bağlantı varken gönderin
            </Text>
          </View>
          <Pressable
            onPress={() => void handleFlushQueue()}
            disabled={flushing}
            style={{
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              paddingHorizontal: 14,
              paddingVertical: 10,
              opacity: flushing ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
              {flushing ? '…' : 'Gönder'}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <SectionHeader title="Özet" />
      {loading && !hasStats.current ? (
        <View style={styles.pillRow}>
          <Skeleton height={64} style={{ flex: 1, marginRight: 8 }} />
          <Skeleton height={64} style={{ flex: 1 }} />
        </View>
      ) : (
        <>
          <View style={styles.pillRow}>
            <StatPill label="Açık iş" value={openCount ?? '—'} />
            <StatPill label="Hazır" value={deliveredToday ?? '—'} tone="success" />
            <StatPill label="Kuyruk" value={queueCount} tone={queueCount ? 'warning' : 'default'} />
          </View>
          <View style={[styles.pillRow, { marginTop: 8 }]}>
            <StatPill
              label="Bugün satış"
              value={todaySales == null ? '—' : `${Math.round(todaySales).toLocaleString('tr-TR')}₺`}
              tone="success"
            />
            <StatPill label="Düşük stok" value={lowStock ?? '—'} tone={lowStock ? 'warning' : 'default'} />
            <StatPill
              label="Kasa"
              value={openShift == null ? '—' : openShift ? 'Açık' : 'Kapalı'}
              tone={openShift ? 'success' : 'warning'}
            />
          </View>
        </>
      )}

      <SectionHeader title="Tüm modüller" />
      <View style={styles.grid}>
        {modules.map(a => (
          <View key={a.href} style={{ width: cardWidth }}>
            <Pressable
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radiusLg,
                  minHeight: appearance.density === 'compact' ? 88 : 104,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={() => router.push(a.href as never)}
            >
              <View style={[styles.iconBox, { backgroundColor: `${a.accent}18` }]}>
                <FontAwesome name={a.icon} size={18} color={a.accent} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{a.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16 }}>{a.sub}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <SectionHeader title="Hesap" />
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Rol</Text>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>
          {me?.role || profile?.role || '—'}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>E-posta</Text>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{user?.email}</Text>
      </Card>

      <Button title="Görünüm ayarları" variant="secondary" onPress={() => router.push('/gorunum' as never)} />
      <Button title="Çıkış Yap" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 4 },
  brand: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  h1: { fontSize: 26, fontWeight: '900', color: '#fff' },
  muted: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 8 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pillRow: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: { fontWeight: '800', fontSize: 15 },
})
