import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

export type AdminAlert = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  resource: string
  resourceId?: string
  href: string
  count?: number
  timestamp: string
}

type Props = {
  alert: AdminAlert
  onPress: (alert: AdminAlert) => void
}

export function AdminMobileAlertCard({ alert, onPress }: Props) {
  const { colors } = useAppTheme()

  const isCritical = alert.severity === 'critical'
  const isWarning = alert.severity === 'warning'

  const accentColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#0284c7'
  const bgColor = isCritical ? 'rgba(239, 68, 68, 0.08)' : isWarning ? 'rgba(245, 158, 11, 0.08)' : 'rgba(2, 132, 199, 0.08)'
  const iconName = isCritical ? 'exclamation-triangle' : isWarning ? 'exclamation-circle' : 'info-circle'

  return (
    <Pressable
      onPress={() => onPress(alert)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor: accentColor,
          borderRadius: colors.radiusLg,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: `${accentColor}20` }]}>
        <FontAwesome name={iconName} size={16} color={accentColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {alert.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${accentColor}25` }]}>
            <Text style={[styles.badgeText, { color: accentColor }]}>
              {isCritical ? 'KRİTİK' : isWarning ? 'UYARI' : 'BİLGİ'}
            </Text>
          </View>
        </View>

        <Text style={[styles.desc, { color: colors.muted }]} numberOfLines={2}>
          {alert.description}
        </Text>
      </View>

      <FontAwesome name="chevron-right" size={12} color={colors.muted} style={styles.chevron} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
    minHeight: 64,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    marginLeft: 4,
  },
})
