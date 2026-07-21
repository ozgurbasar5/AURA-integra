import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
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
import { ListRow } from '@/components/ui/ListRow'
import { Screen } from '@/components/ui/Screen'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/States'

type Tab = 'push' | 'queue'

export default function BildirimlerScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const [tab, setTab] = useState<Tab>('push')
  const [status, setStatus] = useState('—')
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')
  const [queue, setQueue] = useState<QueuedJob[]>([])
  const [busy, setBusy] = useState(false)
  const [flushing, setFlushing] = useState(false)

  const refresh = useCallback(async () => {
    const [jobs, perm] = await Promise.all([
      listQueuedJobs(),
      getPushPermissionStatus(),
    ])
    setQueue(jobs)
    setPermission(perm)
  }, [])

  useFocusEffect(useCallback(() => { void refresh() }, [refresh]))

  async function enablePush() {
    if (!profile?.tenant_id) {
      setStatus('Profil yok')
      return
    }
    setBusy(true)
    try {
      const result = await registerForPushNotifications()
      if (result.ok) {
        setStatus(`Push kaydı tamam (${result.token.slice(0, 12)}…)`)
        setPermission('granted')
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
    permission === 'granted' ? 'İzin verildi'
      : permission === 'denied' ? 'İzin reddedildi'
        : 'İzin bekleniyor'

  return (
    <ModuleGuard tab="bildirimler">
    <Screen scroll>
      <SectionHeader title="Bildirimler" />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip label="Push" active={tab === 'push'} onPress={() => setTab('push')} />
        <Chip label={`Offline kuyruk (${queue.length})`} active={tab === 'queue'} onPress={() => setTab('queue')} />
      </View>

      {tab === 'push' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>Cihaz bildirimleri</Text>
            <Chip
              label={permLabel}
              active={permission === 'granted'}
              tone={permission === 'denied' ? 'danger' : 'default'}
            />
          </View>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
            Onay ve teslim olaylarında Expo push kullanılır. İzin verip kaydı yenileyin.
          </Text>
          <Button title="Push'u etkinleştir / yenile" loading={busy} onPress={() => void enablePush()} />
          <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>{status}</Text>
        </Card>
      ) : (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{queue.length} bekleyen işlem</Text>
          {queue.length > 0 ? (
            <>
              <Button
                title="Kuyruğu gönder"
                loading={flushing}
                onPress={() => void sendQueue()}
                style={{ marginTop: 12 }}
              />
              {queue.map(job => (
                <ListRow
                  key={job.id}
                  title={job.label || job.path}
                  meta={new Date(job.created_at).toLocaleString('tr-TR')}
                />
              ))}
            </>
          ) : (
            <EmptyState icon="cloud" title="Kuyruk boş" subtitle="Çevrimdışı işlem yok" />
          )}
        </Card>
      )}
    </Screen>
    </ModuleGuard>
  )
}
