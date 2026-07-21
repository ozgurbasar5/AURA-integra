import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { useTenant } from '@/lib/TenantContext'
import { useAppTheme } from '@/lib/ThemeContext'

export function BrandHeader({ title }: { title?: string }) {
  const { colors } = useAppTheme()
  const { profile, user } = useAuth()
  const { me } = useTenant()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const shop =
    me?.shop_name ||
    me?.company_name ||
    'AURA İntegra'
  const person = me?.full_name || profile?.full_name || user?.email || ''
  const role = me?.role || profile?.role || ''
  const initial = (shop || 'A').trim().charAt(0).toUpperCase()

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          paddingTop: Math.max(insets.top, 8),
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.logo, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.logoText, { color: colors.primary }]}>{initial}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.shop, { color: colors.text }]} numberOfLines={1}>
            {shop}
          </Text>
          <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={1}>
            {[title, role, person].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/yenilikler' as never)}
          style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
          hitSlop={8}
        >
          <FontAwesome name="magic" size={14} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/gorunum' as never)}
          style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
          hitSlop={8}
        >
          <FontAwesome name="sliders" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontWeight: '900', fontSize: 18 },
  meta: { flex: 1, minWidth: 0 },
  shop: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
