import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'
import { StatPill } from '@/components/ui/States'

type Props = {
  todaySales: number | null
  openCount: number | null
}

export function CashierHomeWidget({ todaySales, openCount }: Props) {
  const { colors } = useAppTheme()
  const router = useRouter()

  return (
    <View style={styles.container}>
      {/* Role Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.roleBadge, { backgroundColor: colors.successSoft }]}>
          <FontAwesome name="credit-card" size={13} color={colors.success} />
          <Text style={[styles.roleText, { color: colors.success }]}>KASİYER KONSOLU</Text>
        </View>
      </View>

      {/* KPI Stats */}
      <View style={styles.statsRow}>
        <StatPill
          label="Bugün Hasılat"
          value={todaySales == null ? '—' : `${Math.round(todaySales).toLocaleString('tr-TR')}₺`}
          tone="success"
        />
        <StatPill label="Bekleyen Teslimat" value={openCount ?? '—'} tone="warning" />
      </View>

      {/* Quick Ops */}
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
          onPress={() => router.push('/satis')}
        >
          <FontAwesome name="shopping-cart" size={24} color="#fff" />
          <Text style={styles.primaryActionTitle}>Hızlı Satış / POS</Text>
          <Text style={styles.primaryActionSub}>Barkod ile anında satış</Text>
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
          onPress={() => router.push('/kasa')}
        >
          <FontAwesome name="money" size={24} color={colors.success} />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Kasa İşlemleri</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Gelir, gider & sayım</Text>
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
          onPress={() => router.push('/kabul')}
        >
          <FontAwesome name="plus-circle" size={24} color={colors.primary} />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Cihaz Kabul</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Müşteri servis fişi</Text>
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
          onPress={() => router.push('/cari' as never)}
        >
          <FontAwesome name="address-card" size={24} color="#8b5cf6" />
          <Text style={[styles.actionTitle, { color: colors.text }]}>Cari & Tahsilat</Text>
          <Text style={[styles.actionSub, { color: colors.muted }]}>Müşteri borç / ödeme</Text>
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
