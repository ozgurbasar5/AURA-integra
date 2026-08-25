import React from 'react'
import { ActionSheet, type ActionSheetOption } from '@/components/ui/ActionSheet'
import { statusLabel } from '@/lib/status-labels'

const ALL_STATUSES = [
  { id: 'alindi', label: 'Alındı / Giriş', icon: 'clipboard' as const, tone: 'default' as const },
  { id: 'teshis', label: 'Teşhis / İnceleme', icon: 'search' as const, tone: 'default' as const },
  { id: 'onay_bekleniyor', label: 'Onay Bekliyor', icon: 'clock-o' as const, tone: 'warning' as const },
  { id: 'tamir', label: 'Tamirde / İşlemde', icon: 'wrench' as const, tone: 'primary' as const },
  { id: 'parts_waiting', label: 'Parça Bekliyor', icon: 'cube' as const, tone: 'warning' as const },
  { id: 'kalite_kontrol', label: 'Kalite Kontrol / QC', icon: 'check-square-o' as const, tone: 'primary' as const },
  { id: 'hazir', label: 'Teslimata Hazır', icon: 'check-circle' as const, tone: 'success' as const },
  { id: 'iptal', label: 'İptal Edildi', icon: 'ban' as const, tone: 'danger' as const },
]

type Props = {
  visible: boolean
  currentStatus: string
  onSelectStatus: (newStatus: string) => void
  onClose: () => void
}

export function StatusActionSheet({
  visible,
  currentStatus,
  onSelectStatus,
  onClose,
}: Props) {
  const options: ActionSheetOption[] = ALL_STATUSES.map(s => ({
    id: s.id,
    label: s.label,
    subtitle: s.id === currentStatus ? 'Şu anki durum' : undefined,
    icon: s.icon,
    tone: s.tone,
  }))

  return (
    <ActionSheet
      visible={visible}
      title="Durum Güncelle"
      subtitle={`Mevcut durum: ${statusLabel(currentStatus)}`}
      options={options}
      selectedId={currentStatus}
      onSelect={opt => onSelectStatus(opt.id)}
      onClose={onClose}
    />
  )
}
