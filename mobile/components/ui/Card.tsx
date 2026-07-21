import { StyleSheet, View, type ViewProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

export function Card({ style, children, ...rest }: ViewProps) {
  const { colors } = useAppTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusLg,
          padding: colors.space,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
})
