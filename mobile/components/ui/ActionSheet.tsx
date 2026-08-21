import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'

export type ActionSheetOption = {
  id: string
  label: string
  subtitle?: string
  icon?: React.ComponentProps<typeof FontAwesome>['name']
  iconColor?: string
  tone?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  disabled?: boolean
  destructive?: boolean
}

type Props = {
  visible: boolean
  title?: string
  subtitle?: string
  options: ActionSheetOption[]
  selectedId?: string
  onSelect: (option: ActionSheetOption) => void
  onClose: () => void
  snapPoints?: (string | number)[]
}

export function ActionSheet({
  visible,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  onClose,
  snapPoints: customSnapPoints,
}: Props) {
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const snapPoints = useMemo(() => {
    if (customSnapPoints) return customSnapPoints
    const count = options.length
    if (count <= 4) return ['45%', '60%']
    if (count <= 7) return ['65%', '85%']
    return ['75%', '92%']
  }, [options.length, customSnapPoints])

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present()
    } else {
      bottomSheetModalRef.current?.dismiss()
    }
  }, [visible])

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1 && visible) {
        onClose()
      }
    },
    [visible, onClose],
  )

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  )

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 44, height: 4 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <View style={styles.root}>
        {(title || subtitle) && (
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              {title && (
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <FontAwesome name="times" size={16} color={colors.muted} />
            </Pressable>
          </View>
        )}

        <BottomSheetScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {options.map(opt => {
            const isSelected = selectedId === opt.id
            const isDestructive = opt.destructive || opt.tone === 'danger'
            let textColor = colors.text
            let iconColor = opt.iconColor || colors.muted
            let bg = colors.bgElevated

            if (isSelected) {
              textColor = colors.primary
              iconColor = colors.primary
              bg = colors.primarySoft
            } else if (isDestructive) {
              textColor = colors.danger
              iconColor = colors.danger
              bg = colors.dangerSoft
            } else if (opt.tone === 'success') {
              textColor = colors.success
              iconColor = colors.success
              bg = colors.successSoft
            } else if (opt.tone === 'warning') {
              textColor = colors.warning
              iconColor = colors.warning
            }

            return (
              <Pressable
                key={opt.id}
                disabled={opt.disabled}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: isSelected ? bg : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: colors.radiusLg,
                    opacity: opt.disabled ? 0.4 : pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => {
                  onSelect(opt)
                  onClose()
                }}
              >
                {opt.icon && (
                  <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                    <FontAwesome name={opt.icon} size={18} color={iconColor} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
                  {opt.subtitle ? (
                    <Text style={[styles.optionSub, { color: colors.muted }]}>{opt.subtitle}</Text>
                  ) : null}
                </View>
                {isSelected && <FontAwesome name="check" size={16} color={colors.primary} />}
              </Pressable>
            )
          })}
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { fontSize: 15, fontWeight: '700' },
  optionSub: { fontSize: 12, marginTop: 1 },
})
