import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = TextInputProps & {
  label?: string
  leftIcon?: React.ReactNode
  error?: string
}

export function TextField({ label, leftIcon, error, style, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useAppTheme()
  const [isFocused, setIsFocused] = useState(false)

  const isError = !!error
  const borderColor = isError ? colors.danger : isFocused ? colors.primary : colors.border
  const labelColor = isError ? colors.danger : isFocused ? colors.primary : colors.muted

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: labelColor }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: borderColor,
            borderRadius: colors.radius,
            backgroundColor: colors.bgElevated,
            borderWidth: isFocused || isError ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.iconBox}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          accessibilityHint={rest.placeholder}
          onFocus={e => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={e => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          style={[
            styles.input,
            {
              color: colors.text,
            },
            style,
          ]}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 8 },
  errorText: { fontSize: 11, fontWeight: '600', marginLeft: 4, marginTop: -2 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  iconBox: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 46,
  },
})

