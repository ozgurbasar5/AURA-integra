import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

export default function NotFoundScreen() {
  const { colors } = useAppTheme()
  return (
    <>
      <Stack.Screen options={{ title: 'Sayfa bulunamadı' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Bu sayfa bulunamadı</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          Aradığınız ekran taşınmış veya kaldırılmış olabilir.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Ana ekrana dön</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
