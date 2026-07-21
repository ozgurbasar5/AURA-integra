import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { profileGateMessage } from '@/lib/profile-gate'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { loading, profileLoading, session, mfaPending, profile, signOut } = useAuth()
  const { colors } = useAppTheme()

  if (!session || mfaPending) return <>{children}</>

  if (loading || profileLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Profil yükleniyor…</Text>
      </View>
    )
  }

  const blockMsg = profileGateMessage(profile, false)
  if (blockMsg) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Erişim engellendi</Text>
        <Text style={[styles.msg, { color: colors.muted }]}>{blockMsg}</Text>
        <Button title="Çıkış yap" onPress={() => void signOut()} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  msg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
