import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

type Props = PressableProps & {
  title: string
  loading?: boolean
  variant?: Variant
}

export function Button({ title, loading, variant = 'primary', disabled, style, ...rest }: Props) {
  const { colors } = useAppTheme()
  const bg =
    variant === 'primary' ? colors.primary
      : variant === 'danger' ? colors.danger
        : variant === 'secondary' ? colors.card
          : 'transparent'
  const color =
    variant === 'secondary' || variant === 'ghost' ? colors.text : '#fff'
  const border =
    variant === 'secondary' || variant === 'ghost'
      ? { borderWidth: 1, borderColor: colors.border }
      : null

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: colors.radius,
          opacity: pressed || disabled || loading ? 0.75 : 1,
          minHeight: 48,
        },
        border,
        style as object,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.text, { color }]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: { fontWeight: '800', fontSize: 15 },
})
