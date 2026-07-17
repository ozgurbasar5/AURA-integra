import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { apiFetch, checkApiHealth } from '@/lib/api'
import { listQueuedJobs, flushQueue } from '@/lib/offline-queue'
import { isMobileTabAllowed } from '@/lib/role-tabs'
import { AuraColors } from '@/constants/AuraColors'
import { registerForPushNotifications } from '@/lib/push'
import { API_BASE_URL } from '@/lib/supabase'

type Quick = {
  href: string
  label: string
  sub: string
  tab: 'kabul' | 'atolye' | 'satis' | 'kasa' | 'sayim' | 'cari' | 'vitrin' | 'alis'
  accent: string
}

const QUICK: Quick[] = [
  { href: '/kabul', label: 'Hızlı Kabul', sub: 'Yeni servis', tab: 'kabul', accent: '#0284c7' },
  { href: '/atolye', label: 'Atölye', sub: 'Açık işler', tab: 'atolye', accent: '#0e5568' },
  { href: '/satis', label: 'Satış', sub: 'POS', tab: 'satis', accent: '#059669' },
  { href: '/kasa', label: 'Kasa', sub: 'Vardiya', tab: 'kasa', accent: '#d97706' },
  { href: '/sayim', label: 'Sayım', sub: 'Stok sayım', tab: 'sayim', accent: '#7c3aed' },
  { href: '/cari', label: 'Cari', sub: 'Tahsilat', tab: 'cari', accent: '#0369a1' },
  { href: '/vitrin', label: 'Vitrin', sub: '2. el', tab: 'vitrin', accent: '#0d9488' },
  { href: '/alis', label: 'Alış', sub: 'Son kayıtlar', tab: 'alis', accent: '#b45309' },
]

export default function HomeScreen() {
  const { profile, user, signOut } = useAuth()
  const router = useRouter()
  const role = profile?.role
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [netHint, setNetHint] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [flushing, setFlushing] = useState(false)

  const loadStats = useCallback(async () => {
    if (!profile?.tenant_id) return
    setLoading(true)
    setNetHint(null)
    try {
      setQueueCount((await listQueuedJobs()).length)
      const health = await checkApiHealth()
      if (!health.ok) {
        setNetHint(health.hint || 'API sağlık kontrolü başarısız')
      }
      try {
        const json = await apiFetch('/api/service-orders?limit=50') as { data?: Array<{ status?: string }> }
        const rows = json.data ?? []
        const open = rows.filter(r => {
          const s = String(r.status || '').toLowerCase()
          return !['teslim', 'iptal', 'delivered', 'cancelled'].includes(s)
        }).length
        setOpenCount(open)
      } catch (e) {
        setOpenCount(null)
        const msg = e instanceof Error ? e.message : 'Veri yüklenemedi'
        // 404 = eski deploy; bağlantı değil
        if (/404/.test(msg)) {
          setNetHint('Sunucu güncel değil (API 404). Web deploy’unu kontrol edin.')
        } else if (/401|403/.test(msg)) {
          setNetHint('Oturum geçersiz — tekrar giriş yapın.')
        } else if (!health.ok) {
          setNetHint(msg)
        } else {
          setNetHint(msg)
        }
      }
    } catch {
      setQueueCount((await listQueuedJobs()).length)
      setNetHint('Sunucuya ulaşılamadı')
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useFocusEffect(useCallback(() => { void loadStats() }, [loadStats]))

  useFocusEffect(useCallback(() => {
    if (profile?.tenant_id) void registerForPushNotifications().catch(() => {})
  }, [profile?.tenant_id]))

  async function handleFlushQueue() {
    setFlushing(true)
    try {
      await flushQueue()
      setQueueCount((await listQueuedJobs()).length)
    } finally {
      setFlushing(false)
    }
  }

  const actions = QUICK.filter(q => isMobileTabAllowed(q.tab, role))
  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.brand}>AURA Integra</Text>
        <Text style={styles.h1}>Merhaba{firstName ? `, ${firstName}` : ''}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
      </View>

      {netHint ? (
        <View style={styles.netBanner}>
          <Text style={styles.netTitle}>Uyarı</Text>
          <Text style={styles.netBody}>{netHint}</Text>
          <Text style={styles.netMeta} numberOfLines={1}>{API_BASE_URL}</Text>
          <Pressable onPress={() => void loadStats()}>
            <Text style={styles.netRetry}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}

      {queueCount > 0 ? (
        <View style={styles.queueBanner}>
          <Text style={styles.queueTitle}>Çevrimdışı kuyruk · {queueCount}</Text>
          <Pressable style={styles.queueBtn} onPress={() => void handleFlushQueue()} disabled={flushing}>
            {flushing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.queueBtnText}>Şimdi gönder</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Açık atölye işleri</Text>
        {loading && openCount == null ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.statValue}>{openCount ?? '—'}</Text>
        )}
        <Pressable onPress={() => router.push('/atolye')}>
          <Text style={styles.statLink}>Atölyeye git →</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>İşlemler</Text>
      <View style={styles.grid}>
        {actions.map(a => (
          <Pressable
            key={a.href}
            style={styles.action}
            onPress={() => router.push(a.href as never)}
          >
            <View style={[styles.dot, { backgroundColor: a.accent }]} />
            <Text style={styles.actionTitle}>{a.label}</Text>
            <Text style={styles.actionSub}>{a.sub}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.logout} onPress={() => void signOut()}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: AuraColors.primaryDark,
    gap: 4,
  },
  brand: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  h1: { fontSize: 26, fontWeight: '900', color: '#fff' },
  muted: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  netBanner: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 4,
  },
  netTitle: { fontWeight: '800', color: '#c2410c', fontSize: 13 },
  netBody: { color: '#9a3412', fontSize: 13, lineHeight: 18 },
  netMeta: { color: '#fb923c', fontSize: 10, marginTop: 2 },
  netRetry: { color: AuraColors.primary, fontWeight: '800', marginTop: 6, fontSize: 13 },
  queueBanner: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  queueTitle: { fontWeight: '700', color: AuraColors.text, fontSize: 13, flex: 1 },
  queueBtn: {
    backgroundColor: AuraColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  queueBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: AuraColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  statCard: {
    backgroundColor: AuraColors.primary,
    borderRadius: 18,
    padding: 18,
    gap: 4,
  },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  statValue: { color: '#fff', fontSize: 40, fontWeight: '900' },
  statLink: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    width: '47%',
    backgroundColor: AuraColors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 4,
    minHeight: 88,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  actionTitle: { fontWeight: '800', color: AuraColors.text, fontSize: 15 },
  actionSub: { color: AuraColors.muted, fontSize: 12 },
  logout: {
    marginTop: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: AuraColors.card,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  logoutText: { color: AuraColors.danger, fontWeight: '800' },
})
