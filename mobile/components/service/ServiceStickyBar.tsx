import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  isDone: boolean
  busy: boolean
  onOpenStatus: () => void
  onOpenPart: () => void
  onTakePhoto: () => void
  onOpenCustomer: () => void
  onOpenDeliver: () => void
}

export function ServiceStickyBar({
  isDone,
  busy,
  onOpenStatus,
  onOpenPart,
  onTakePhoto,
  onOpenCustomer,
  onOpenDeliver,
}: Props) {
  const { colors, isDark } = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 12)

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    action()
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomPad,
          shadowColor: isDark ? '#000' : '#000',
        },
      ]}
    >
      <View style={styles.buttonRow}>
        {/* 1. Status Button */}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
              opacity: busy ? 0.6 : pressed ? 0.8 : 1,
            },
          ]}
          disabled={busy}
          onPress={() => handlePress(onOpenStatus)}
          accessibilityRole="button"
          accessibilityLabel="Durum Değiştir"
        >
          <FontAwesome name="exchange" size={16} color={colors.primary} />
          <Text style={[styles.buttonText, { color: colors.primary }]}>Durum</Text>
        </Pressable>

        {/* 2. Add Part Button */}
        {!isDone && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                opacity: busy ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
            disabled={busy}
            onPress={() => handlePress(onOpenPart)}
            accessibilityRole="button"
            accessibilityLabel="Parça Ekle"
          >
            <FontAwesome name="cube" size={16} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Parça</Text>
          </Pressable>
        )}

        {/* 3. Take Photo Button (Direct Camera Trigger) */}
        {!isDone && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                opacity: busy ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
            disabled={busy}
            onPress={() => handlePress(onTakePhoto)}
            accessibilityRole="button"
            accessibilityLabel="Fotoğraf Çek"
          >
            <FontAwesome name="camera" size={16} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Foto</Text>
          </Pressable>
        )}

        {/* 4. Customer Contact Button */}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: '#10b98118',
              borderColor: '#10b98150',
              opacity: busy ? 0.6 : pressed ? 0.8 : 1,
            },
          ]}
          disabled={busy}
          onPress={() => handlePress(onOpenCustomer)}
          accessibilityRole="button"
          accessibilityLabel="Müşteri İletişim & WhatsApp"
        >
          <FontAwesome name="whatsapp" size={18} color="#10b981" />
          <Text style={[styles.buttonText, { color: '#10b981' }]}>Müşteri</Text>
        </Pressable>

        {/* 5. Deliver Button */}
        {!isDone && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.deliverButton,
              {
                backgroundColor: colors.success,
                opacity: busy ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
            disabled={busy}
            onPress={() => handlePress(onOpenDeliver)}
            accessibilityRole="button"
            accessibilityLabel="Cihazı Teslim Et"
          >
            <FontAwesome name="check" size={16} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff', fontWeight: '900' }]}>Teslim</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  deliverButton: {
    flex: 1.15,
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '800',
  },
})
