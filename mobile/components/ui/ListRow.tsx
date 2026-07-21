import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = PressableProps & {
  title: string
  subtitle?: string
  meta?: string
  right?: React.ReactNode
  icon?: React.ComponentProps<typeof FontAwesome>['name']
  chevron?: boolean
}

export function ListRow({ title, subtitle, meta, right, icon, chevron, style, ...rest }: Props) {
  const { colors } = useAppTheme()
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusLg,
          opacity: pressed ? 0.85 : 1,
          padding: colors.space,
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
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: colors.text }]} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {right}
      {chevron ? <FontAwesome name="chevron-right" size={12} color={colors.muted} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { fontWeight: '800', fontSize: 15 },
  sub: { fontSize: 13 },
  meta: { fontSize: 12, marginTop: 2 },
})
