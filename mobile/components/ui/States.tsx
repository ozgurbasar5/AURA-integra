import Animated, {
  FadeIn as ReanimatedFadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

/** Hafif fade — liste satırlarında spring kullanma */
export function FadeInView({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <Animated.View entering={ReanimatedFadeIn.duration(180).delay(delay)}>
      {children}
    </Animated.View>
  )
}

/** @deprecated FadeInView kullan — geriye uyumluluk */
export function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
  index?: number
}) {
  return <FadeInView delay={delay}>{children}</FadeInView>
}

export function Skeleton({ height = 72, style }: { height?: number; style?: object }) {
  const { colors } = useAppTheme()
  const opacity = useSharedValue(0.35)
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 700 }), -1, true)
  }, [opacity])
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: colors.radius,
          backgroundColor: colors.border,
          marginBottom: 10,
        },
        anim,
        style,
      ]}
    />
  )
}

export function LoadingBlock({ label = 'Yükleniyor…' }: { label?: string }) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.loadingText, { color: colors.muted }]}>{label}</Text>
      <View style={{ width: '100%', marginTop: 16, paddingHorizontal: 24 }}>
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    </View>
  )
}

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentProps<typeof FontAwesome>['name']
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const { colors } = useAppTheme()
  return (
    <Animated.View entering={ReanimatedFadeIn.duration(200)} style={styles.centerPad}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <FontAwesome name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySub, { color: colors.muted }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  )
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const { colors } = useAppTheme()
  return (
    <Animated.View
      entering={ReanimatedFadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={[
        styles.errorBox,
        {
          backgroundColor: colors.dangerSoft,
          borderColor: colors.danger,
          borderRadius: colors.radius,
        },
      ]}
    >
      <FontAwesome name="exclamation-circle" size={16} color={colors.danger} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.errorTitle, { color: colors.danger }]}>Yüklenemedi</Text>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>{message}</Text>
      </View>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Tekrar</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  )
}

export function StatPill({
  label,
  value,
  tone = 'default',
  icon,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'success' | 'warning' | 'danger'
  icon?: React.ComponentProps<typeof FontAwesome>['name']
}) {
  const { colors, isDark } = useAppTheme()
  const bg =
    tone === 'success' ? colors.successSoft
      : tone === 'warning' ? colors.warningSoft
        : tone === 'danger' ? colors.dangerSoft
          : colors.primarySoft
  const fg =
    tone === 'success' ? colors.success
      : tone === 'warning' ? colors.warning
        : tone === 'danger' ? colors.danger
          : colors.primary

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isDark ? colors.card : colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: colors.radiusLg || 16,
          shadowColor: isDark ? '#000000' : fg,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}
    >
      <View style={[styles.pillHeader, { backgroundColor: bg }]}>
        {icon ? <FontAwesome name={icon} size={12} color={fg} /> : null}
        <Text style={[styles.pillValue, { color: fg }]}>{value}</Text>
      </View>
      <Text style={[styles.pillLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  centerPad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  loadingText: { marginTop: 12, fontWeight: '600', fontSize: 13 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  actionBtn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 12 },
  actionText: { color: '#fff', fontWeight: '800' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  errorTitle: { fontWeight: '800', fontSize: 13, marginBottom: 2 },
  pill: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'flex-start', gap: 4 },
  pillHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillValue: { fontSize: 18, fontWeight: '900' },
  pillLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
})
