import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = TextInputProps & {
  onClear?: () => void
}

export function SearchBar({ style, onClear, value, ...rest }: Props) {
  const { colors } = useAppTheme()
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <FontAwesome name="search" size={14} color={colors.muted} />
      <TextInput
        value={value}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }, style]}
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...rest}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
})
