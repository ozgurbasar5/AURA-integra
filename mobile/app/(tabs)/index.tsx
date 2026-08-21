import { useCallback, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/lib/auth'
import { useTenant } from '@/lib/TenantContext'
import { apiFetch, checkApiHealth, invalidateApiCache } from '@/lib/api'
import { listQueuedJobs, type QueuedJob } from '@/lib/offline-queue'
import { flushQueueWithMeta, formatFlushResult } from '@/lib/offline-sync'
import { getModulesForRole } from '@/lib/role-tabs'
import { getPushPermissionStatus, registerForPushNotifications } from '@/lib/push'
import { useAppTheme } from '@/lib/ThemeContext'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ListRow } from '@/components/ui/ListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ErrorBanner, Skeleton } from '@/components/ui/States'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { TechnicianHomeWidget } from '@/components/home/TechnicianHomeWidget'
import { ManagerHomeWidget } from '@/components/home/ManagerHomeWidget'
import { CashierHomeWidget } from '@/components/home/CashierHomeWidget'

export default function HomeScreen() {
  const { profile, user, signOut } = useAuth()
  const { me } = useTenant()
  const { colors, appearance } = useAppTheme()
  const router = useRouter()
  const role = String(me?.role || profile?.role || '').toLowerCase()
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [deliveredToday, setDeliveredToday] = useState<number | null>(null)
  const [todaySales, setTodaySales] = useState<number | null>(null)
  const [lowStock, setLowStock] = useState<number | null>(null)
  const [waitingApproval, setWaitingApproval] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [netHint, setNetHint] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [queueJobs, setQueueJobs] = useState<QueuedJob[]>([])
  const [flushing, setFlushing] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
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
          waiting_approval?: number
        }
      }>
      const healthP = checkApiHealth(false)

      const [queue, statsRes, health] = await Promise.all([
        queued,
        statsP.catch((e: unknown) => ({ __err: e })),
        healthP,
      ])
      setQueueCount(queue.length)
      setQueueJobs(queue)

      if (!health.ok && health.hint) setNetHint(health.hint)

      if ('__err' in (statsRes as object)) {
        const e = (statsRes as { __err: unknown }).__err
        const msg = e instanceof Error ? e.message : 'Veri yüklenemedi'
        if (!hasStats.current) {
          setOpenCount(null)
          setDeliveredToday(null)
          setTodaySales(null)
          setLowStock(null)
          setWaitingApproval(null)
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
        setWaitingApproval(Number(s.waiting_approval) || 0)
        hasStats.current = true
        if (health.ok) setNetHint(null)
      }
    } catch {
      const jobs = await listQueuedJobs()
      setQueueCount(jobs.length)
      setQueueJobs(jobs)
      if (!hasStats.current) setNetHint('Sunucuya ulaşılamadı')
    } finally {
      setLoading(false)
    }
  }, [profile, profile?.tenant_id])

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        if (!hasStats.current) await loadStats(false)
        else await loadStats(true)
      })()
    }, [loadStats]),
  )

  useFocusEffect(
    useCallback(() => {
      if (!profile?.tenant_id) return
      void (async () => {
        const perm = await getPushPermissionStatus()
        if (perm === 'granted') await registerForPushNotifications().catch(() => {})
      })()
    }, [profile?.tenant_id]),
  )

  useFocusEffect(
    useCallback(() => {
      void listQueuedJobs().then(jobs => {
        setQueueCount(jobs.length)
        setQueueJobs(jobs)
      })
    }, []),
  )

  async function handleFlushQueue() {
    setFlushing(true)
    try {
      const result = await flushQueueWithMeta()
      setQueueCount(result.remaining.length)
      setQueueJobs(result.remaining)
      invalidateApiCache('/api/tenant/stats')
      await loadStats(true)
      if (result.ok > 0 || result.fail > 0) {
        Alert.alert('Çevrimdışı kuyruk', formatFlushResult(result))
      }
    } finally {
      setFlushing(false)
    }
  }

  const modules = getModulesForRole(role)
  const firstName = (me?.full_name || profile?.full_name || '').split(' ')[0]
  const shop = me?.shop_name || me?.company_name
  const cols = appearance.homeColumns
  const cardWidth = cols === 3 ? '31%' : ('48%' as const)

  const isTechnician = role === 'teknisyen' || role === 'technician'
  const isCashier = role === 'kasiyer' || role === 'cashier'

  return (
    <Screen scroll>
      {/* Brand Hero */}
      <View style={[styles.hero, { backgroundColor: colors.primaryDark, borderRadius: colors.radiusLg }]}>
        <Text style={styles.brand}>AURA İntegra · Mobile 2.0</Text>
        <Text style={styles.h1}>Merhaba{firstName ? `, ${firstName}` : ''}</Text>
        <Text style={styles.muted}>{[shop, user?.email].filter(Boolean).join(' · ')}</Text>
        <View style={styles.heroActions}>
          <Pressable
            style={styles.heroChip}
            onPress={() => {
              invalidateApiCache()
              void loadStats(true)
            }}
          >
            <FontAwesome name="refresh" size={12} color="#fff" />
            <Text style={styles.heroChipText}>Yenile</Text>
          </Pressable>
          <Pressable style={styles.heroChip} onPress={() => setScanOpen(true)}>
            <FontAwesome name="barcode" size={12} color="#fff" />
            <Text style={styles.heroChipText}>Barkod Tara</Text>
          </Pressable>
          <Pressable style={styles.heroChip} onPress={() => router.push('/gorunum' as never)}>
            <FontAwesome name="sliders" size={12} color="#fff" />
            <Text style={styles.heroChipText}>Görünüm</Text>
          </Pressable>
        </View>
      </View>

      {netHint ? <ErrorBanner message={netHint} onRetry={() => void loadStats(true)} /> : null}

      {/* Offline Queue Sync Card */}
      {queueCount > 0 ? (
        <Card style={styles.queueRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.text, fontSize: 14 }}>Çevrimdışı Kuyruk</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              {queueCount} işlem bekliyor — bağlantı gelince otomatik gönderilir
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

      {queueJobs.length > 0 ? (
        <>
          <SectionHeader title="Bekleyen İşlemler" />
          {queueJobs.slice(0, 5).map(job => (
            <ListRow
              key={job.id}
              title={job.label || job.path}
              meta={new Date(job.created_at).toLocaleString('tr-TR')}
            />
          ))}
        </>
      ) : null}

      {/* Role-Aware Dashboard Section */}
      <SectionHeader title="Operasyon Paneli" />
      {loading && !hasStats.current ? (
        <View style={{ gap: 10 }}>
          <Skeleton height={60} style={{ borderRadius: 12 }} />
          <Skeleton height={140} style={{ borderRadius: 16 }} />
        </View>
      ) : isTechnician ? (
        <TechnicianHomeWidget
          openCount={openCount}
          readyCount={deliveredToday}
          waitingApproval={waitingApproval}
          onRefresh={() => void loadStats(true)}
          onScan={() => setScanOpen(true)}
        />
      ) : isCashier ? (
        <CashierHomeWidget
          todaySales={todaySales}
          openCount={openCount}
        />
      ) : (
        <ManagerHomeWidget
          openCount={openCount}
          todaySales={todaySales}
          lowStock={lowStock}
        />
      )}

      {/* Quick All-Modules Grid */}
      <SectionHeader title="Tüm Modüller" />
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
                  minHeight: appearance.density === 'compact' ? 88 : 100,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
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

      {/* Account Info */}
      <SectionHeader title="Hesap" />
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Rol & Yetki</Text>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>
          {me?.role || profile?.role || '—'}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>E-posta</Text>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{user?.email}</Text>
      </Card>

      <Button title="Görünüm Ayarları" variant="secondary" onPress={() => router.push('/gorunum' as never)} />
      <Button title="Çıkış Yap" variant="ghost" onPress={() => void signOut()} />

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={data => {
          // If 15 digits IMEI or starts with SRV, open search
          router.push('/atolye' as never)
        }}
      />
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
