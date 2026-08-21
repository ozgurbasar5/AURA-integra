import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useAppTheme } from '@/lib/ThemeContext'

type Option = { label: string; value: string; subtitle?: string }

type Props = {
  visible: boolean
  title: string
  options: Option[]
  selected: string
  onSelect: (value: string) => void
  onClose: () => void
}

/**
 * BottomSheetSelect — mobile-friendly picker using @gorhom/bottom-sheet.
 * Each option has a minimum 48px touch target.
 */
export function BottomSheetSelect({ visible, title, options, selected, onSelect, onClose }: Props) {
  const { colors } = useAppTheme()
  const ref = useRef<BottomSheetModal>(null)
  const snapPoints = useMemo(() => ['50%', '75%'], [])

  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])

  const handleChange = useCallback((index: number) => {
    if (index === -1 && visible) onClose()
  }, [visible, onClose])

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  )

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.bg }}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Kapat">
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Kapat</Text>
        </Pressable>
      </View>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {options.map(opt => {
          const isSelected = opt.value === selected
          return (
            <Pressable
              key={opt.value}
              onPress={() => { onSelect(opt.value); onClose() }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isSelected ? colors.primarySoft : pressed ? colors.bgElevated : 'transparent',
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optLabel, { color: isSelected ? colors.primary : colors.text }]}>
                  {opt.label}
                </Text>
                {opt.subtitle ? (
                  <Text style={[styles.optSub, { color: colors.muted }]}>{opt.subtitle}</Text>
                ) : null}
              </View>
              {isSelected ? (
                <View style={[styles.check, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '900' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optLabel: { fontSize: 15, fontWeight: '700' },
  optSub: { fontSize: 12, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
