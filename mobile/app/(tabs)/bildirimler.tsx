import { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@/lib/auth'
import { getPushPermissionStatus, registerForPushNotifications } from '@/lib/push'
import { listQueuedJobs, type QueuedJob } from '@/lib/offline-queue'
import { flushQueueWithMeta, formatFlushResult } from '@/lib/offline-sync'
import { showToast } from '@/lib/toast'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Screen } from '@/components/ui/Screen'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/States'

type Tab = 'push' | 'queue'

export default function BildirimlerScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('push')
  const [status, setStatus] = useState('—')
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')
  const [queue, setQueue] = useState<QueuedJob[]>([])
  const [busy, setBusy] = useState(false)
  const [flushing, setFlushing] = useState(false)

  const refresh = useCallback(async () => {
    const [jobs, perm] = await Promise.all([listQueuedJobs(), getPushPermissionStatus()])
    setQueue(jobs)
    setPermission(perm)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  async function enablePush() {
    if (!profile?.tenant_id) {
      setStatus('Profil bulunamadı')
      return
    }
    setBusy(true)
    try {
      const result = await registerForPushNotifications()
      if (result.ok) {
        setStatus(`Push kaydı aktif (${result.token.slice(0, 12)}…)`)
        setPermission('granted')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        setStatus(result.message)
        setPermission(result.permission === 'denied' ? 'denied' : 'undetermined')
      }
    } finally {
      setBusy(false)
    }
  }

  async function sendQueue() {
    setFlushing(true)
    try {
      const result = await flushQueueWithMeta()
      setQueue(result.remaining)
      if (result.ok > 0 || result.fail > 0) {
        showToast(formatFlushResult(result), result.fail > 0 ? 'warning' : 'success')
      }
    } finally {
      setFlushing(false)
    }
  }

  const permLabel =
    permission === 'granted' ? 'İzin Verildi' : permission === 'denied' ? 'İzin Reddedildi' : 'İzin Bekleniyor'

  return (
    <ModuleGuard tab="bildirimler">
      <Screen scroll>
        <SectionHeader title="Bildirim & Eşitleme Merkezi" />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Chip label="Cihaz Push Bildirimleri" active={tab === 'push'} onPress={() => setTab('push')} />
          <Chip
            label={`Çevrimdışı Kuyruk (${queue.length})`}
            active={tab === 'queue'}
            tone={queue.length > 0 ? 'warning' : 'default'}
            onPress={() => setTab('queue')}
          />
        </View>

        {tab === 'push' ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
                <FontAwesome name="bell" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Anlık Bildirimler</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Onay, teslim ve yeni servis uyarıları</Text>
              </View>
              <Chip
                label={permLabel}
                active={permission === 'granted'}
                tone={permission === 'denied' ? 'danger' : 'default'}
              />
            </View>

            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
              Müşteri online teklif onayladığında veya servise cihaz geldiğinde cihazınıza anlık push bildirimi gönderilir.
            </Text>

            <Button
              title="Push Bildirimlerini Etkinleştir / Yenile"
              loading={busy}
              onPress={() => void enablePush()}
              style={{ minHeight: 48 }}
            />
            {status !== '—' && <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>{status}</Text>}
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
                  {queue.length} Bekleyen İşlem
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  İnternet bağlantısı kesildiğinde yapılan işlemler
                </Text>
              </View>
            </View>

            {queue.length > 0 ? (
              <>
                <Button
                  title="Kuyruktaki Tüm İşlemleri Gönder"
                  loading={flushing}
                  onPress={() => void sendQueue()}
                  style={{ marginBottom: 12, minHeight: 48 }}
                />
                {queue.map(job => (
                  <View key={job.id} style={[styles.jobCard, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.jobTitle, { color: colors.text }]}>{job.label || job.path}</Text>
                      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                        {new Date(job.created_at).toLocaleString('tr-TR')} · {job.method}
                      </Text>
                    </View>
                    <View style={[styles.queuedPill, { backgroundColor: colors.warningSoft }]}>
                      <Text style={{ color: colors.warning, fontSize: 10, fontWeight: '800' }}>KUYRUKTA</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <EmptyState icon="cloud" title="Kuyruk Boş" subtitle="Bekleyen çevrimdışı işlem yok, tüm veriler güncel." />
            )}
          </Card>
        )}
      </Screen>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  jobTitle: { fontSize: 14, fontWeight: '700' },
  queuedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
})
