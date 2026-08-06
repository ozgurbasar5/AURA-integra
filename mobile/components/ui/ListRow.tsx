import React from 'react'
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = PressableProps & {
  title: string
  subtitle?: string
  meta?: string
  badgeText?: string
  badgeColor?: string
  right?: React.ReactNode
  icon?: React.ComponentProps<typeof FontAwesome>['name']
  chevron?: boolean
}

export function ListRow({ title, subtitle, meta, badgeText, badgeColor, right, icon, chevron, style, ...rest }: Props) {
  const { colors, isDark } = useAppTheme()
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusLg,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          padding: colors.space,
          shadowColor: isDark ? '#000000' : '#64748b',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: 6,
          elevation: isDark ? 2 : 2,
        },
        style as object,
      ]}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(', ')}
      {...rest}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <FontAwesome name={icon} size={16} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          {badgeText ? (
            <View style={[styles.badge, { backgroundColor: badgeColor || colors.primarySoft }]}>
              <Text style={[styles.badgeText, { color: badgeColor ? '#ffffff' : colors.primary }]}>
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={[styles.meta, { color: colors.primary }]}>{meta}</Text> : null}
      </View>
      {right}
      {chevron ? <FontAwesome name="chevron-right" size={12} color={colors.muted} style={{ marginLeft: 4 }} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: { fontWeight: '700', fontSize: 15, flex: 1 },
  sub: { fontSize: 13, marginTop: 1 },
  meta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
})

