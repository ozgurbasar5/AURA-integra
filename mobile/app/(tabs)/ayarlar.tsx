import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/lib/auth'
import { useTenant } from '@/lib/TenantContext'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { isOwnerRole } from '@/lib/role-tabs'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TextField } from '@/components/ui/TextField'
import { AdminMobileConsole } from '@/components/admin/AdminMobileConsole'

export default function AyarlarScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { me, refresh } = useTenant()
  const { colors } = useAppTheme()
  const router = useRouter()
  const role = String(me?.role || profile?.role || '').toLowerCase()
  const isOwner = isOwnerRole(role)
  const [activeView, setActiveView] = useState<'admin' | 'profile'>(isOwner ? 'admin' : 'profile')

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
      setMsg('Profil başarıyla güncellendi')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    Alert.alert('Çıkış Yap', 'Oturumunuz kapatılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => void signOut() },
    ])
  }

  return (
    <ModuleGuard tab="ayarlar">
      {isOwner && (
        <View style={[styles.topSwitchBar, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setActiveView('admin')}
            style={[
              styles.switchTab,
              activeView === 'admin' && [styles.switchTabActive, { backgroundColor: colors.primary }],
            ]}
          >
            <FontAwesome name="dashboard" size={13} color={activeView === 'admin' ? '#fff' : colors.muted} />
            <Text style={[styles.switchLabel, { color: activeView === 'admin' ? '#fff' : colors.muted }]}>
              Admin Konsolu 2.0
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveView('profile')}
            style={[
              styles.switchTab,
              activeView === 'profile' && [styles.switchTabActive, { backgroundColor: colors.primary }],
            ]}
          >
            <FontAwesome name="user" size={13} color={activeView === 'profile' ? '#fff' : colors.muted} />
            <Text style={[styles.switchLabel, { color: activeView === 'profile' ? '#fff' : colors.muted }]}>
              Profil & Tercihler
            </Text>
          </Pressable>
        </View>
      )}

      {isOwner && activeView === 'admin' ? (
        <AdminMobileConsole />
      ) : (
        <Screen scroll>
          <SectionHeader title="Kullanıcı & Bayi Bilgileri" />
          <Card>
            <View style={styles.profileRow}>
              <View style={[styles.avatarBox, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(fullName || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: colors.text }]}>{fullName || 'İsimsiz Kullanıcı'}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{user?.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: colors.bgElevated }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {(me?.role || profile?.role || 'ÜYE').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Bağlı Bayi / Mağaza</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                {me?.shop_name || me?.company_name || 'AURA İntegra Bayisi'}
              </Text>
              <TextField label="Görünen Ad / Soyad" value={fullName} onChangeText={setFullName} />
              <Button title="Profili Güncelle" loading={busy} onPress={() => void saveProfile()} />
              {msg ? <Text style={{ color: colors.success, fontWeight: '700', marginTop: 4 }}>{msg}</Text> : null}
            </View>
          </Card>

          <SectionHeader title="Uygulama & Tercihler" />
          <View style={{ gap: 8 }}>
            <Button
              title="🎨 Görünüm & Tema Ayarları"
              variant="secondary"
              onPress={() => router.push('/gorunum' as never)}
              style={{ minHeight: 48 }}
            />
            <Button
              title="✨ Yenilikler & Sürüm Notları"
              variant="secondary"
              onPress={() => router.push('/yenilikler' as never)}
              style={{ minHeight: 48 }}
            />
            <Button
              title="🔔 Bildirim & Eşitleme Merkezi"
              variant="secondary"
              onPress={() => router.push('/bildirimler' as never)}
              style={{ minHeight: 48 }}
            />
            <Button
              title="🚪 Güvenli Çıkış Yap"
              variant="danger"
              onPress={handleLogout}
              style={{ minHeight: 48, marginTop: 8 }}
            />
          </View>

          <View style={styles.footerNote}>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
              AURA İntegra Mobile 2.0 · v2.4.0 (Build 2026)
            </Text>
          </View>
        </Screen>
      )}
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  topSwitchBar: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    minHeight: 44,
  },
  switchTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '900' },
  profileName: { fontSize: 16, fontWeight: '800' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  footerNote: { paddingVertical: 20, alignItems: 'center' },
})
