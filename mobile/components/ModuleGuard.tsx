import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'
import { isMobileTabAllowed, type MobileTab } from '@/lib/role-tabs'
import { useAuth } from '@/lib/auth'
import { EmptyState, LoadingBlock } from '@/components/ui/States'

type Props = {
  tab: MobileTab
  children: React.ReactNode
}

export function ModuleGuard({ tab, children }: Props) {
  const { profile, profileLoading } = useAuth()
  const { colors } = useAppTheme()

  if (profileLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="Yetki kontrol ediliyor…" />
      </View>
    )
  }

  if (!isMobileTabAllowed(tab, profile?.role)) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, padding: 24 }]}>
        <EmptyState
          icon="lock"
          title="Bu modüle erişiminiz yok"
          subtitle="Yöneticinizden yetki isteyin veya Ana ekrandan devam edin."
        />
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
