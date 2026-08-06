import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

type Props = PressableProps & {
  title: string
  loading?: boolean
  variant?: Variant
  icon?: React.ReactNode
}

export function Button({ title, loading, variant = 'primary', disabled, icon, style, ...rest }: Props) {
  const { colors } = useAppTheme()
  const bg =
    variant === 'primary' ? colors.primary
      : variant === 'danger' ? colors.danger
        : variant === 'secondary' ? colors.card
          : 'transparent'
  const color =
    variant === 'secondary' || variant === 'ghost' ? colors.text : '#ffffff'

  const border =
    variant === 'secondary' || variant === 'ghost'
      ? { borderWidth: 1, borderColor: colors.border }
      : null

  const shadowStyle = variant === 'primary' ? {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  } : variant === 'danger' ? {
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  } : null

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: colors.radius,
          opacity: disabled || loading ? 0.6 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.98 : 1 }],
          minHeight: 48,
        },
        shadowStyle,
        border,
        style as object,
      ]}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconBox}>{icon}</View> : null}
          <Text style={[styles.text, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
})

