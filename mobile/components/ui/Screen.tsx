import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = ViewProps & {
  scroll?: boolean
  padded?: boolean
  children: React.ReactNode
}

export function Screen({ scroll, padded = true, style, children, ...rest }: Props) {
  const { colors, appearance } = useAppTheme()
  const insets = useSafeAreaInsets()
  const pad = padded ? colors.space : 0
  const bottomExtra = appearance.tabBarStyle === 'floating' ? 72 + insets.bottom : colors.space * 2

  if (scroll) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bg }, style]}
        contentContainerStyle={{
          padding: pad,
          paddingBottom: bottomExtra,
          gap: colors.spaceSm,
        }}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, padding: pad }, style]} {...rest}>
      {children}
    </View>
  )
}

/** Tab bar + safe area alt boşluk — checkout / FAB overlay için */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets()
  const { appearance } = useAppTheme()
  return appearance.tabBarStyle === 'floating' ? 72 + insets.bottom : insets.bottom + 16
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
