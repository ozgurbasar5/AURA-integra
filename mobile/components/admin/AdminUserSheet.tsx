import React, { useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'

export type UserItem = {
  id: string
  full_name: string
  role: string
  is_active: boolean
  created_at?: string
}

type Props = {
  visible: boolean
  user: UserItem | null
  onClose: () => void
  onSaveRole: (userId: string, newRole: string) => Promise<void>
  onToggleActive: (userId: string, current: boolean) => Promise<void>
}

const ROLES = [
  { id: 'tenant_admin', label: 'Sahip / Yönetici', desc: 'Tam yetkili kurumsal yönetici' },
  { id: 'mudur', label: 'Müdür', desc: 'Operasyon ve finans yönetimi' },
  { id: 'teknisyen', label: 'Teknisyen', desc: 'Servis ve atölye onarımları' },
  { id: 'muhasebe', label: 'Muhasebe', desc: 'Finans, kasa ve cari işlemler' },
  { id: 'satis', label: 'Satış / POS', desc: 'Satış ve servis kabul işlemleri' },
  { id: 'kasiyer', label: 'Kasiyer', desc: 'Hızlı tahsilat ve kasa hareketleri' },
  { id: 'viewer', label: 'Görüntüleme', desc: 'Sadece salt okunur izleme' },
]

export function AdminUserSheet({
  visible,
  user,
  onClose,
  onSaveRole,
  onToggleActive,
}: Props) {
  const { colors } = useAppTheme()
  const [selectedRole, setSelectedRole] = useState(user?.role || 'teknisyen')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (user) {
      setSelectedRole(user.role)
    }
  }, [user])

  if (!user) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveRole(user.id, selectedRole)
      onClose()
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Rol güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    setSaving(true)
    try {
      await onToggleActive(user.id, user.is_active)
      onClose()
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Durum güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{user.full_name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                ID: {user.id.slice(0, 8)}… · Durum: {user.is_active ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* Role Selection List */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Kullanıcı Rolü</Text>
          <ScrollView style={styles.roleList} contentContainerStyle={{ gap: 8 }}>
            {ROLES.map(r => {
              const isSelected = selectedRole === r.id
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setSelectedRole(r.id)}
                  style={[
                    styles.roleItem,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.bgElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.roleLabel,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {r.label}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{r.desc}</Text>
                  </View>
                  {isSelected && <FontAwesome name="check-circle" size={18} color={colors.primary} />}
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={user.is_active ? 'Kullanıcıyı Pasife Al' : 'Kullanıcıyı Aktifleştir'}
              variant={user.is_active ? 'danger' : 'secondary'}
              loading={saving}
              onPress={handleToggle}
              style={{ flex: 1, minHeight: 48 }}
            />
            <Button
              title="Rolü Kaydet"
              variant="primary"
              loading={saving}
              onPress={handleSave}
              style={{ flex: 1, minHeight: 48 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  roleList: {
    maxHeight: 260,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
})
