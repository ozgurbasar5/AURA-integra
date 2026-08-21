import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'
import { StatPill } from '@/components/ui/States'

type Props = {
  openCount: number | null
  todaySales: number | null
  lowStock: number | null
  liquidity?: number | null
}

export function ManagerHomeWidget({
  openCount,
  todaySales,
  lowStock,
  liquidity,
}: Props) {
  const { colors } = useAppTheme()
  const router = useRouter()

  return (
    <View style={styles.container}>
      {/* Role Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.roleBadge, { backgroundColor: colors.primarySoft }]}>
          <FontAwesome name="briefcase" size={13} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>YÖNETİCİ KONSOLU</Text>
        </View>
      </View>

      {/* KPI Stats */}
      <View style={styles.statsRow}>
        <StatPill
          label="Bugün Satış"
          value={todaySales == null ? '—' : `${Math.round(todaySales).toLocaleString('tr-TR')}₺`}
          tone="success"
        />
        <StatPill label="Açık Servis" value={openCount ?? '—'} tone="default" />
        <StatPill label="Kritik Stok" value={lowStock ?? '—'} tone={lowStock ? 'warning' : 'default'} />
      </View>

      {/* Quick Actions */}
      <View style={styles.grid}>
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => router.push('/kasa')}
        >
          <FontAwesome name="money" size={22} color={colors.success} />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Kasa & Likidite</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Hesaplar, virman & mutabakat</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => router.push('/raporlar' as never)}
        >
          <FontAwesome name="bar-chart" size={22} color={colors.primary} />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Günlük EOD & Rapor</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Ciro, maliyet & kâr</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => router.push('/stok')}
        >
          <FontAwesome name="cubes" size={22} color={lowStock ? colors.warning : colors.primary} />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Stok & Sipariş</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Kritik parçalar & transfer</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => router.push('/musteriler' as never)}
        >
          <FontAwesome name="users" size={22} color="#8b5cf6" />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Müşteri & CRM</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Cari bakiye & geçmiş</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '48%',
    padding: 14,
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  actionSub: { fontSize: 11 },
})
