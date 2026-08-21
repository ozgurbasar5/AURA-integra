import React from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { useAppTheme } from '@/lib/ThemeContext'
import { statusLabel } from '@/lib/status-labels'
import { buildWaMeUrl, buildServiceReceiptText } from '@/lib/wa'

export type ServiceOrderSummary = {
  id: string
  order_no: string | null
  customer_name: string | null
  customer_phone?: string | null
  status: string | null
  device_brand?: string | null
  device_model?: string | null
  fault_description?: string | null
  updated_at?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
}

type Props = {
  item: ServiceOrderSummary
  onPress: () => void
  onQuickStatus?: () => void
}

export function ServiceCardItem({ item, onPress, onQuickStatus }: Props) {
  const { colors } = useAppTheme()

  const orderNo = item.order_no || item.id.slice(0, 8)
  const device = [item.device_brand, item.device_model].filter(Boolean).join(' ') || 'Cihaz'
  const cost = item.actual_cost ?? item.estimated_cost

  const handleCall = () => {
    if (!item.customer_phone) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void Linking.openURL(`tel:${item.customer_phone.replace(/\D/g, '')}`)
  }

  const handleWhatsApp = () => {
    if (!item.customer_phone) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const text = buildServiceReceiptText({
      order_no: orderNo,
      customer_name: item.customer_name || 'Müşteri',
      customer_phone: item.customer_phone,
      device_brand: item.device_brand || '',
      device_model: item.device_model || '',
      status: statusLabel(item.status),
    })
    void Linking.openURL(buildWaMeUrl(item.customer_phone, text))
  }

  const isDone = item.status === 'teslim' || item.status === 'delivered'

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusLg,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Servis ${orderNo}, ${device}, Durum ${statusLabel(item.status)}`}
    >
      {/* Header: Order No & Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.orderNoWrap}>
          <Text style={[styles.orderNo, { color: colors.text }]}>{orderNo}</Text>
          <Text style={[styles.deviceText, { color: colors.muted }]} numberOfLines={1}>
            {device}
          </Text>
        </View>
        <Pressable
          onPress={onQuickStatus || onPress}
          style={[styles.statusBadge, { backgroundColor: colors.primarySoft }]}
          hitSlop={6}
        >
          <Text style={[styles.statusText, { color: colors.primary }]}>{statusLabel(item.status)}</Text>
          <FontAwesome name="chevron-down" size={9} color={colors.primary} style={{ marginLeft: 3 }} />
        </Pressable>
      </View>

      {/* Customer & Fault info */}
      <View style={styles.middleRow}>
        <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
          {item.customer_name || 'İsimsiz Müşteri'}
        </Text>
        {item.fault_description ? (
          <Text style={[styles.faultText, { color: colors.muted }]} numberOfLines={2}>
            {item.fault_description}
          </Text>
        ) : null}
      </View>

      {/* Footer: Date / Cost / Quick Action Buttons */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          {cost != null && cost > 0 ? (
            <Text style={[styles.costText, { color: colors.primary }]}>
              {Number(cost).toLocaleString('tr-TR')} ₺
            </Text>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {item.updated_at ? new Date(item.updated_at).toLocaleDateString('tr-TR') : '—'}
            </Text>
          )}
        </View>

        {/* 1-Tap Action Pills (≥44px target) */}
        <View style={styles.quickActions}>
          {item.customer_phone ? (
            <>
              <Pressable
                style={[styles.quickBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                onPress={handleCall}
                hitSlop={6}
                accessibilityLabel="Müşteriyi Ara"
              >
                <FontAwesome name="phone" size={13} color={colors.primary} />
                <Text style={[styles.quickBtnText, { color: colors.primary }]}>Ara</Text>
              </Pressable>

              <Pressable
                style={[styles.quickBtn, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}
                onPress={handleWhatsApp}
                hitSlop={6}
                accessibilityLabel="WhatsApp Mesajı Gönder"
              >
                <FontAwesome name="whatsapp" size={14} color="#10b981" />
                <Text style={[styles.quickBtnText, { color: '#10b981' }]}>WA</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable
            style={[styles.quickBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
            onPress={onPress}
            hitSlop={6}
          >
            <Text style={[styles.quickBtnText, { color: colors.primary, fontWeight: '800' }]}>Detay</Text>
            <FontAwesome name="chevron-right" size={10} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: 110,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderNoWrap: { flex: 1 },
  orderNo: { fontSize: 16, fontWeight: '900' },
  deviceText: { fontSize: 13, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  middleRow: { gap: 2 },
  customerName: { fontSize: 14, fontWeight: '700' },
  faultText: { fontSize: 12, lineHeight: 16 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  costText: { fontSize: 15, fontWeight: '900' },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
  },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
})
