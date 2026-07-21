import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { useTenant } from '@/lib/TenantContext'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TextField } from '@/components/ui/TextField'

export default function AyarlarScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { me, refresh } = useTenant()
  const { colors } = useAppTheme()
  const router = useRouter()
  const [fullName, setFullName] = useState(me?.full_name || profile?.full_name || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function saveProfile() {
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/tenant/profile', {
        method: 'PUT',
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      invalidateApiCache('/api/tenant/me')
      await refreshProfile()
      await refresh(true)
      setMsg('Kaydedildi')
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModuleGuard tab="ayarlar">
    <Screen scroll>
      <SectionHeader title="Hesap" />
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12 }}>E-posta</Text>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12 }}>{user?.email}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Rol</Text>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12 }}>
          {me?.role || profile?.role || '—'}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Mağaza</Text>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12 }}>
          {me?.shop_name || me?.company_name || '—'}
        </Text>
        <TextField label="Görünen ad" value={fullName} onChangeText={setFullName} />
        <Button title="Profili kaydet" loading={busy} onPress={() => void saveProfile()} />
        {msg ? <Text style={{ color: colors.success, marginTop: 8 }}>{msg}</Text> : null}
      </Card>

      <SectionHeader title="Uygulama" />
      <Button title="Görünüm ayarları" variant="secondary" onPress={() => router.push('/gorunum' as never)} />
      <Button title="Yenilikler" variant="secondary" onPress={() => router.push('/yenilikler' as never)} />
      <Button title="Bildirimler" variant="secondary" onPress={() => router.push('/bildirimler' as never)} />
      <Button title="Çıkış yap" variant="danger" onPress={() => void signOut()} />
    </Screen>
    </ModuleGuard>
  )
}
