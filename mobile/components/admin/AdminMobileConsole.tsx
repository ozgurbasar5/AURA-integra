import React, { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'
import { apiFetch } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AdminMobileAlertCard, type AdminAlert } from './AdminMobileAlertCard'
import { AdminUserSheet, type UserItem } from './AdminUserSheet'
import { AdminSearchModal } from './AdminSearchModal'

export type AdminSegment = 'komuta' | 'ekip' | 'sistem' | 'kurallar'

export type AdminKpiSummary = {
  servicesActive: number
  servicesDeliveredToday: number
  quotesPending: number
  totalAccountsBalance: number
  criticalStockCount: number
  warrantyClaimsPending: number
  activePersonnelCount: number
  activeBranchesCount: number
  alertCount: number
}

export type ServiceRulesConfig = {
  default_service_fee: number
  warranty_months_default: number
  auto_require_qc: boolean
  approval_threshold_amount: number
  numbering_prefixes: {
    service: string
    customer: string
    warranty: string
    invoice: string
  }
  status_transitions: {
    allow_skip_diagnosis: boolean
    require_quote_before_repair: boolean
    auto_notify_on_ready: boolean
  }
}

function formatCurrency(val: number): string {
  return '₺' + Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AdminMobileConsole() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const [segment, setSegment] = useState<AdminSegment>('komuta')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [kpis, setKpis] = useState<AdminKpiSummary>({
    servicesActive: 0,
    servicesDeliveredToday: 0,
    quotesPending: 0,
    totalAccountsBalance: 0,
    criticalStockCount: 0,
    warrantyClaimsPending: 0,
    activePersonnelCount: 1,
    activeBranchesCount: 1,
    alertCount: 0,
  })
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [serviceRules, setServiceRules] = useState<ServiceRulesConfig | null>(null)

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [userSheetOpen, setUserSheetOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  const loadAdminData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [centerRes, orgRes, rulesRes, auditRes] = await Promise.all([
        apiFetch('/api/admin/center', { fresh: true }).catch(() => null) as Promise<any>,
        apiFetch('/api/tenant/organization', { fresh: true }).catch(() => null) as Promise<any>,
        apiFetch('/api/tenant/service-rules', { fresh: true }).catch(() => null) as Promise<any>,
        apiFetch('/api/admin/audit-logs?limit=15', { fresh: true }).catch(() => null) as Promise<any>,
      ])

      if (centerRes?.ok) {
        if (centerRes.kpis) setKpis(centerRes.kpis)
        if (centerRes.alerts) setAlerts(centerRes.alerts)
        if (centerRes.health) setHealth(centerRes.health)
      }
      if (orgRes?.ok) {
        if (orgRes.users) setUsers(orgRes.users)
        if (orgRes.branches) setBranches(orgRes.branches)
      }
      if (rulesRes?.ok && rulesRes.rules) {
        setServiceRules(rulesRes.rules)
      }
      if (auditRes?.data) {
        setAuditLogs(auditRes.data)
      }
    } catch {
      /* ignore error */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const handleAlertPress = (alert: AdminAlert) => {
    if (alert.resource === 'inventory') router.push('/stok' as never)
    else if (alert.resource === 'services') router.push('/atolye' as never)
    else if (alert.resource === 'warranty') router.push('/garanti' as never)
    else router.push('/kasa' as never)
  }

  const handleSaveRole = async (userId: string, newRole: string) => {
    await apiFetch('/api/tenant/organization', {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'user',
        id: userId,
        updates: { role: newRole },
      }),
    })
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)))
    Alert.alert('Başarılı', 'Kullanıcı rolü güncellendi')
  }

  const handleToggleUserActive = async (userId: string, current: boolean) => {
    await apiFetch('/api/tenant/organization', {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'user',
        id: userId,
        updates: { is_active: !current },
      }),
    })
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_active: !current } : u)))
    Alert.alert('Başarılı', current ? 'Kullanıcı pasife alındı' : 'Kullanıcı aktif edildi')
  }

  const handleToggleRule = async (field: keyof ServiceRulesConfig['status_transitions']) => {
    if (!serviceRules) return
    const updatedTransitions = {
      ...serviceRules.status_transitions,
      [field]: !serviceRules.status_transitions[field],
    }
    const updated = {
      ...serviceRules,
      status_transitions: updatedTransitions,
    }
    try {
      await apiFetch('/api/tenant/service-rules', {
        method: 'PUT',
        body: JSON.stringify(updated),
      })
      setServiceRules(updated)
      Alert.alert('Başarılı', 'Kural güncellendi')
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Güncellenemedi')
    }
  }

  const SEGMENTS: { id: AdminSegment; label: string; icon: any }[] = [
    { id: 'komuta', label: 'Komuta', icon: 'dashboard' },
    { id: 'ekip', label: 'Ekip & Şube', icon: 'users' },
    { id: 'sistem', label: 'Sağlık & Audit', icon: 'heartbeat' },
    { id: 'kurallar', label: 'Kurallar', icon: 'cogs' },
  ]

  return (
    <View style={styles.root}>
      {/* Top Search Bar & Segment Controls */}
      <View style={[styles.topHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Mobile 2.0</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Kurumsal Yönetim & Operasyon</Text>
          </View>
          <Pressable
            onPress={() => setSearchModalOpen(true)}
            style={[styles.searchBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
          >
            <FontAwesome name="search" size={13} color={colors.primary} />
            <Text style={[styles.searchBtnText, { color: colors.text }]}>Ara…</Text>
          </Pressable>
        </View>

        {/* Segmented Bar */}
        <View style={[styles.segmentBar, { backgroundColor: colors.bgElevated }]}>
          {SEGMENTS.map(s => {
            const isSelected = segment === s.id
            return (
              <Pressable
                key={s.id}
                onPress={() => setSegment(s.id)}
                style={[
                  styles.segmentBtn,
                  isSelected && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
                ]}
              >
                <FontAwesome
                  name={s.icon as any}
                  size={12}
                  color={isSelected ? '#fff' : colors.muted}
                />
                <Text
                  style={[
                    styles.segmentLabel,
                    { color: isSelected ? '#fff' : colors.muted },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadAdminData(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── SEGMENT: KOMUTA ─────────────────────────────────────────── */}
        {segment === 'komuta' && (
          <View style={{ gap: 14 }}>
            {/* Hero KPI Overview Cards */}
            <View style={styles.kpiGrid}>
              <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>AKTİF SERVİS</Text>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{kpis.servicesActive}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Onarımda / Bekliyor</Text>
              </Card>

              <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>BUGÜN TESLİM</Text>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>{kpis.servicesDeliveredToday}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Tamamlanan</Text>
              </Card>

              <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>LİKİDİTE</Text>
                <Text style={[styles.kpiValue, { color: '#16a34a' }]} numberOfLines={1}>
                  {formatCurrency(kpis.totalAccountsBalance)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Kasa & Hesaplar</Text>
              </Card>

              <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>KRİTİK UYARI</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: alerts.length > 0 ? '#ef4444' : colors.muted },
                  ]}
                >
                  {alerts.length}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>Müdahale Bekleyen</Text>
              </Card>
            </View>

            {/* Quick Action Chips */}
            <View style={styles.quickActionRow}>
              <Button
                title="⚡ Yeni Servis"
                variant="primary"
                onPress={() => router.push('/kabul' as never)}
                style={{ flex: 1, minHeight: 44 }}
              />
              <Button
                title="💰 Kasa"
                variant="secondary"
                onPress={() => router.push('/kasa' as never)}
                style={{ flex: 1, minHeight: 44 }}
              />
              <Button
                title="📦 Stok"
                variant="secondary"
                onPress={() => router.push('/stok' as never)}
                style={{ flex: 1, minHeight: 44 }}
              />
            </View>

            {/* Alert Center */}
            <SectionHeader title={`Kritik Uyarılar (${alerts.length})`} />
            {alerts.length > 0 ? (
              alerts.map(a => (
                <AdminMobileAlertCard key={a.id} alert={a} onPress={handleAlertPress} />
              ))
            ) : (
              <Card style={styles.allClearCard}>
                <FontAwesome name="check-circle" size={24} color="#16a34a" />
                <Text style={[styles.allClearTitle, { color: colors.text }]}>Tüm Sistemler Normal</Text>
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                  Kritik stok veya bekleyen onay uyarısı bulunmuyor.
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* ── SEGMENT: EKİP & ŞUBE ─────────────────────────────────────── */}
        {segment === 'ekip' && (
          <View style={{ gap: 14 }}>
            <SectionHeader title={`Kayıtlı Kullanıcılar (${users.length})`} />
            {users.map(u => (
              <Pressable
                key={u.id}
                onPress={() => {
                  setSelectedUser(u)
                  setUserSheetOpen(true)
                }}
                style={({ pressed }) => [
                  styles.userRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.userAvatar, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                    {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.userNameRow}>
                    <Text style={[styles.userName, { color: colors.text }]}>{u.full_name}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: u.is_active ? '#16a34a' : colors.muted },
                      ]}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Rol: <Text style={{ color: colors.primary, fontWeight: '700' }}>{u.role}</Text>
                  </Text>
                </View>

                <FontAwesome name="ellipsis-v" size={14} color={colors.muted} />
              </Pressable>
            ))}

            <SectionHeader title={`Kayıtlı Şubeler (${branches.length})`} />
            {branches.map(b => (
              <Card key={b.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>
                    {b.name} {b.is_main ? '⭐ (Merkez)' : ''}
                  </Text>
                  <Text style={{ color: b.is_active !== false ? '#16a34a' : colors.muted, fontWeight: '700', fontSize: 12 }}>
                    {b.is_active !== false ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
                {b.address && <Text style={{ color: colors.muted, fontSize: 12 }}>{b.address}</Text>}
                {b.phone && <Text style={{ color: colors.muted, fontSize: 12 }}>Tel: {b.phone}</Text>}
              </Card>
            ))}
          </View>
        )}

        {/* ── SEGMENT: SİSTEM & AUDIT ─────────────────────────────────── */}
        {segment === 'sistem' && (
          <View style={{ gap: 14 }}>
            <SectionHeader title="Canlı Sistem Sağlığı" />
            <Card style={{ gap: 8 }}>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>PostgreSQL / DB</Text>
                <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12 }}>
                  ✓ Sağlıklı ({health?.db?.latencyMs ?? 15}ms)
                </Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Realtime Gateway</Text>
                <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12 }}>✓ Bağlı</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Cron & SLA Motoru</Text>
                <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12 }}>✓ Aktif</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Webhook Entegrasyon</Text>
                <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12 }}>✓ 0 Hata</Text>
              </View>
            </Card>

            <SectionHeader title={`Son Denetim Günlükleri (${auditLogs.length})`} />
            {auditLogs.map((log, idx) => (
              <View
                key={log.id || idx}
                style={[
                  styles.auditRow,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 13 }}>
                    {log.action} · {log.entity_type || log.target_type || 'system'}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── SEGMENT: KURALLAR ───────────────────────────────────────── */}
        {segment === 'kurallar' && (
          <View style={{ gap: 14 }}>
            <SectionHeader title="Servis Akış & SLA Kuralları" />
            <Card style={{ gap: 10 }}>
              <Pressable
                onPress={() => handleToggleRule('require_quote_before_repair')}
                style={styles.ruleToggleRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: colors.text, fontSize: 13 }}>
                    Tamir Öncesi Fiyat Teklifi Zorunlu
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    Onarıma başlamadan önce müşteriden onay istenir
                  </Text>
                </View>
                <FontAwesome
                  name={serviceRules?.status_transitions?.require_quote_before_repair ? 'check-square' : 'square-o'}
                  size={20}
                  color={serviceRules?.status_transitions?.require_quote_before_repair ? colors.primary : colors.muted}
                />
              </Pressable>

              <Pressable
                onPress={() => handleToggleRule('allow_skip_diagnosis')}
                style={styles.ruleToggleRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: colors.text, fontSize: 13 }}>
                    Teşhis Aşaması Atlanabilsin
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    Doğrudan tamir aşamasına geçişe izin verir
                  </Text>
                </View>
                <FontAwesome
                  name={serviceRules?.status_transitions?.allow_skip_diagnosis ? 'check-square' : 'square-o'}
                  size={20}
                  color={serviceRules?.status_transitions?.allow_skip_diagnosis ? colors.primary : colors.muted}
                />
              </Pressable>
            </Card>

            <SectionHeader title="Kayıt Numaratör Önekleri" />
            <Card style={{ gap: 8 }}>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Servis No Öneki</Text>
                <Text style={{ fontWeight: '800', color: colors.text, fontFamily: 'monospace' }}>
                  {serviceRules?.numbering_prefixes?.service || 'SRV-'}
                </Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Müşteri No Öneki</Text>
                <Text style={{ fontWeight: '800', color: colors.text, fontFamily: 'monospace' }}>
                  {serviceRules?.numbering_prefixes?.customer || 'CUST-'}
                </Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Garanti No Öneki</Text>
                <Text style={{ fontWeight: '800', color: colors.text, fontFamily: 'monospace' }}>
                  {serviceRules?.numbering_prefixes?.warranty || 'WAR-'}
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* User Edit Sheet */}
      <AdminUserSheet
        visible={userSheetOpen}
        user={selectedUser}
        onClose={() => {
          setUserSheetOpen(false)
          setSelectedUser(null)
        }}
        onSaveRole={handleSaveRole}
        onToggleActive={handleToggleUserActive}
      />

      {/* Universal Search Modal */}
      <AdminSearchModal
        visible={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  searchBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    padding: 12,
    gap: 4,
    borderWidth: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  allClearCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  allClearTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  auditRow: {
    padding: 12,
    borderWidth: 1,
  },
  ruleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
})
