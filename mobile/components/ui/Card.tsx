import React from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

export function Card({ style, children, ...rest }: ViewProps) {
  const { colors, isDark } = useAppTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusLg,
          padding: colors.space,
          shadowColor: isDark ? '#000000' : '#64748b',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: isDark ? 2 : 3,
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
    borderWidth: 1,
  },
})

