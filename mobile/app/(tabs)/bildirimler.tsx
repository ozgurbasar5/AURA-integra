import { useCallback, useState } from 'react'
import { Text } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { registerForPushNotifications } from '@/lib/push'
import { listQueuedJobs } from '@/lib/offline-queue'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { SectionHeader } from '@/components/ui/SectionHeader'

export default function BildirimlerScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const [status, setStatus] = useState('—')
  const [queue, setQueue] = useState(0)
  const [busy, setBusy] = useState(false)

  useFocusEffect(useCallback(() => {
    void listQueuedJobs().then(j => setQueue(j.length))
  }, []))

  async function enablePush() {
    if (!profile?.tenant_id) {
      setStatus('Profil yok')
      return
    }
    setBusy(true)
    try {
      await registerForPushNotifications()
      setStatus('Push kaydı gönderildi')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Push kaydı başarısız')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen scroll>
      <SectionHeader title="Bildirimler" />
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>
          Cihaz bildirimleri
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
          Onay ve teslim olaylarında Expo push kullanılır. İzin verip kaydı yenileyin.
        </Text>
        <Button title="Push’u etkinleştir / yenile" loading={busy} onPress={() => void enablePush()} />
        <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>{status}</Text>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Çevrimdışı kuyruk</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{queue} bekleyen işlem</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
          Ana ekrandan kuyruğu gönderebilirsiniz.
        </Text>
      </Card>
    </Screen>
  )
}
