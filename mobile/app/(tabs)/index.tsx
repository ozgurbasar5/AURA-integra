import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { apiFetch, checkApiHealth } from '@/lib/api'
import { listQueuedJobs, flushQueue } from '@/lib/offline-queue'
import { isMobileTabAllowed } from '@/lib/role-tabs'
import { AuraColors } from '@/constants/AuraColors'
import { registerForPushNotifications } from '@/lib/push'

type Quick = { href: string; label: string; sub: string; tab: 'kabul' | 'atolye' | 'satis' | 'kasa' | 'sayim'; accent: string }

const QUICK: Quick[] = [
  { href: '/kabul', label: 'Hızlı Kabul', sub: 'Yeni servis kaydı', tab: 'kabul', accent: '#0284c7' },
  { href: '/atolye', label: 'Atölye', sub: 'Açık işler', tab: 'atolye', accent: '#0e5568' },
  { href: '/satis', label: 'Satış', sub: 'POS sepet', tab: 'satis', accent: '#059669' },
  { href: '/kasa', label: 'Kasa', sub: 'Vardiya aç/kapat', tab: 'kasa', accent: '#d97706' },
  { href: '/sayim', label: 'Sayım', sub: 'Stok sayımı', tab: 'sayim', accent: '#7c3aed' },
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
    try {
      setQueueCount((await listQueuedJobs()).length)
      const health = await checkApiHealth()
      setNetHint(health.ok ? null : (health.hint || 'Bulut bağlantısı yok'))
      const json = await apiFetch('/api/service-orders?limit=50') as { data?: Array<{ status?: string }> }
      const rows = json.data ?? []
      const open = rows.filter(r => {
        const s = String(r.status || '').toLowerCase()
        return !['teslim', 'iptal', 'delivered', 'cancelled'].includes(s)
      }).length
      setOpenCount(open)
    } catch {
      setOpenCount(null)
      setNetHint('Sunucuya ulaşılamadı — Wi‑Fi / DNS kontrol edin')
      setQueueCount((await listQueuedJobs()).length)
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useFocusEffect(useCallback(() => { void loadStats() }, [loadStats]))

  useFocusEffect(useCallback(() => {
    if (profile?.tenant_id) void registerForPushNotifications()
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
          <Text style={styles.netTitle}>Bağlantı uyarısı</Text>
          <Text style={styles.netBody}>{netHint}</Text>
          <Pressable onPress={() => void loadStats()}>
            <Text style={styles.netRetry}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}

      {queueCount > 0 ? (
        <View style={styles.queueBanner}>
          <Text style={styles.queueTitle}>Çevrimdışı kuyruk</Text>
          <Text style={styles.queueBody}>{queueCount} iş bekliyor — bağlantı gelince gönderilir</Text>
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

      <Text style={styles.section}>Hızlı işlemler</Text>
      <View style={styles.grid}>
        {actions.map(a => (
          <Pressable
            key={a.href}
            style={[styles.action, { borderLeftColor: a.accent, borderLeftWidth: 3 }]}
            onPress={() => router.push(a.href as never)}
          >
            <Text style={styles.actionTitle}>{a.label}</Text>
            <Text style={styles.actionSub}>{a.sub}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.yenilikCard} onPress={() => router.push('/yenilikler')}>
        <Text style={styles.yenilikTitle}>Yenilikler</Text>
        <Text style={styles.yenilikSub}>Platformdaki yeni özellikler →</Text>
      </Pressable>

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
    padding: 18,
    backgroundColor: AuraColors.primaryDark,
    gap: 4,
    marginBottom: 4,
  },
  brand: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  h1: { fontSize: 24, fontWeight: '900', color: '#fff' },
  muted: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  netBanner: {
    backgroundColor: AuraColors.warningSoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    gap: 4,
  },
  netTitle: { fontWeight: '800', color: AuraColors.warning, fontSize: 13 },
  netBody: { color: '#92400e', fontSize: 12, lineHeight: 17 },
  netRetry: { color: AuraColors.primary, fontWeight: '800', marginTop: 4, fontSize: 12 },
  queueBanner: {
    backgroundColor: AuraColors.warningSoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    gap: 4,
  },
  queueTitle: { fontWeight: '800', color: AuraColors.warning, fontSize: 13 },
  queueBody: { color: '#92400e', fontSize: 12, lineHeight: 17 },
  queueBtn: {
    alignSelf: 'flex-start',
    backgroundColor: AuraColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    minWidth: 110,
    alignItems: 'center',
  },
  queueBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  section: { fontSize: 12, fontWeight: '800', color: AuraColors.muted, textTransform: 'uppercase', marginTop: 4 },
  statCard: {
    backgroundColor: AuraColors.primary,
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  statValue: { color: '#fff', fontSize: 36, fontWeight: '900' },
  statLink: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    width: '47%',
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 2,
  },
  actionTitle: { fontWeight: '800', color: AuraColors.text, fontSize: 15 },
  actionSub: { color: AuraColors.muted, fontSize: 12 },
  yenilikCard: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 2,
  },
  yenilikTitle: { fontWeight: '800', color: AuraColors.text },
  yenilikSub: { color: AuraColors.muted, fontSize: 12 },
  logout: {
    marginTop: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: AuraColors.dangerSoft,
  },
  logoutText: { color: AuraColors.danger, fontWeight: '800' },
})
