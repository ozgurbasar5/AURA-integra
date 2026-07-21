import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = TextInputProps & {
  label?: string
}

export function TextField({ label, style, ...rest }: Props) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            borderRadius: colors.radius,
            color: colors.text,
            backgroundColor: colors.bgElevated,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
})
