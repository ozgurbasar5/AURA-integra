import React from 'react'
import { Linking, Share } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ActionSheet, type ActionSheetOption } from '@/components/ui/ActionSheet'
import { buildServiceReceiptText, buildWaMeUrl } from '@/lib/wa'
import { statusLabel } from '@/lib/status-labels'
import Constants from 'expo-constants'

type Props = {
  visible: boolean
  order: {
    id: string
    order_no: string
    customer_name: string
    customer_phone?: string
    device_brand?: string
    device_model?: string
    status: string
    estimated_cost?: number
    actual_cost?: number
    approval_token?: string
  }
  onClose: () => void
  onRequestApproval?: () => Promise<void>
}

function getApprovalUrl(token: string): string {
  const base =
    (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
    'https://auraintegra.com'
  return `${base.replace(/\/$/, '')}/onay/${token}`
}

function getTrackingUrl(orderNo: string): string {
  const base =
    (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
    'https://auraintegra.com'
  return `${base.replace(/\/$/, '')}/takip?no=${encodeURIComponent(orderNo)}`
}

export function CustomerActionSheet({
  visible,
  order,
  onClose,
  onRequestApproval,
}: Props) {
  const phone = order.customer_phone
  const cost = order.actual_cost ?? order.estimated_cost ?? 0

  const options: ActionSheetOption[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp ile Durum Bildir',
      subtitle: phone ? `Müşteriye (${phone}) hazır servis mesajı ilet` : 'Telefon numarası eksik',
      icon: 'whatsapp',
      iconColor: '#10b981',
      tone: 'success',
      disabled: !phone,
    },
    {
      id: 'call',
      label: 'Telefonla Ara',
      subtitle: phone ? phone : 'Telefon numarası eksik',
      icon: 'phone',
      iconColor: '#3b82f6',
      tone: 'primary',
      disabled: !phone,
    },
    {
      id: 'approval',
      label: 'WhatsApp Onay Linki Gönder',
      subtitle: `Tahmini tutar: ${cost.toLocaleString('tr-TR')} ₺ için dijital onay linki`,
      icon: 'check-circle',
      iconColor: '#8b5cf6',
      tone: 'default',
      disabled: !phone,
    },
    {
      id: 'share_tracking',
      label: 'Takip Linkini Paylaş (QR/Web)',
      subtitle: 'Sistem paylaşım menüsü ile takip bağlantısını gönder',
      icon: 'share-alt',
      iconColor: '#f59e0b',
      tone: 'default',
    },
  ]

  const handleSelect = async (opt: ActionSheetOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (opt.id === 'call' && phone) {
      void Linking.openURL(`tel:${phone.replace(/\D/g, '')}`)
    } else if (opt.id === 'whatsapp' && phone) {
      const text = buildServiceReceiptText({
        order_no: order.order_no,
        customer_name: order.customer_name,
        customer_phone: phone,
        device_brand: order.device_brand || '',
        device_model: order.device_model || '',
        status: statusLabel(order.status),
      })
      void Linking.openURL(buildWaMeUrl(phone, text))
    } else if (opt.id === 'approval' && phone) {
      if (onRequestApproval && !order.approval_token) {
        await onRequestApproval()
      }
      const token = order.approval_token || order.id
      const link = getApprovalUrl(token)
      const msg = `Merhaba ${order.customer_name}, ${order.device_brand || ''} ${order.device_model || ''} cihazınız için tahmini tutar: ${cost} TL. Onaylamak için lütfen tıklayın: ${link}`
      void Linking.openURL(buildWaMeUrl(phone, msg))
    } else if (opt.id === 'share_tracking') {
      const trackingUrl = getTrackingUrl(order.order_no)
      await Share.share({
        message: `Sayın ${order.customer_name}, ${order.device_brand || ''} ${order.device_model || ''} servis durumunuzu buradan takip edebilirsiniz: ${trackingUrl}`,
        title: `Servis Takip - ${order.order_no}`,
      })
    }
  }

  return (
    <ActionSheet
      visible={visible}
      title={order.customer_name}
      subtitle={phone || 'Telefon Kaydı Yok'}
      options={options}
      onSelect={opt => void handleSelect(opt)}
      onClose={onClose}
    />
  )
}
