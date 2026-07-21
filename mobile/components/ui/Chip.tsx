import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = PressableProps & {
  label: string
  active?: boolean
  tone?: 'default' | 'success' | 'danger'
}

export function Chip({ label, active, tone = 'default', style, ...rest }: Props) {
  const { colors } = useAppTheme()
  const bg = active
    ? (tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.primary)
    : colors.card
  const fg = active ? '#fff' : colors.text
  const border = active ? bg : colors.border

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: colors.radiusSm,
          opacity: pressed ? 0.85 : 1,
        },
        style as object,
      ]}
      {...rest}
    >
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  text: { fontWeight: '700', fontSize: 13 },
})
