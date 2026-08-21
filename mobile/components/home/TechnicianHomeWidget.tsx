import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'
import { Card } from '@/components/ui/Card'
import { StatPill } from '@/components/ui/States'

type Props = {
  openCount: number | null
  readyCount: number | null
  waitingApproval: number | null
  onRefresh: () => void
  onScan: () => void
}

export function TechnicianHomeWidget({
  openCount,
  readyCount,
  waitingApproval,
  onScan,
}: Props) {
  const { colors } = useAppTheme()
  const router = useRouter()

  return (
    <View style={styles.container}>
      {/* Role Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.roleBadge, { backgroundColor: colors.primarySoft }]}>
          <FontAwesome name="wrench" size={13} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>TEKNİSYEN KONSOLU</Text>
        </View>
      </View>

      {/* KPI Stats */}
      <View style={styles.statsRow}>
        <StatPill label="Aktif İşler" value={openCount ?? '—'} tone="default" />
        <StatPill label="Onay Bekleyen" value={waitingApproval ?? '—'} tone="warning" />
        <StatPill label="Hazır / QC" value={readyCount ?? '—'} tone="success" />
      </View>

      {/* Quick Ops 2x2 Grid */}
      <View style={styles.grid}>
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primaryDark,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => router.push('/kabul')}
        >
          <FontAwesome name="plus-circle" size={24} color="#fff" />
          <Text style={styles.primaryActionTitle}>Yeni Kabul</Text>
          <Text style={styles.primaryActionSub}>Hızlı cihaz alımı</Text>
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
          onPress={onScan}
        >
          <FontAwesome name="barcode" size={24} color={colors.primary} />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Barkod / QR</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Cihaz veya parça tara</Text>
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
          onPress={() => router.push('/atolye')}
        >
          <FontAwesome name="tasks" size={24} color="#f59e0b" />
          <Text style={[styles.actionTitle, { color: colors.text }]}>İş Kuyruğu</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Bekleyen & tamirdekiler</Text>
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
          <FontAwesome name="cubes" size={24} color="#10b981" />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Yedek Parça</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Stok kontrol & kullanım</Text>
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
  primaryActionTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4 },
  primaryActionSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  actionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  actionSub: { fontSize: 11 },
})
