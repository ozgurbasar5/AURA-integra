import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Constants from 'expo-constants'
import { apiFetch, apiUpload } from '@/lib/api'
import { usePartsCatalog } from '@/lib/PartsCatalog'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TextField } from '@/components/ui/TextField'
import { ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { statusLabel } from '@/lib/status-labels'
import { buildServiceReceiptText, buildWaMeUrl } from '@/lib/wa'
import { QC_CHECKLIST, qcProgress, isQcComplete } from '@/lib/qc'
import { enqueueJob } from '@/lib/offline-queue'
import { ServiceStickyBar } from '@/components/service/ServiceStickyBar'
import { StatusActionSheet } from '@/components/service/StatusActionSheet'
import { QuickPartSheet } from '@/components/service/QuickPartSheet'
import { CustomerActionSheet } from '@/components/service/CustomerActionSheet'
import { DeliverModalSheet } from '@/components/service/DeliverModalSheet'
import { printLabel } from '@/lib/label-print'
import { printToThermalPrinter } from '@/lib/thermal-printer'

type Order = {
  id: string
  order_no: string
  customer_name: string
  customer_phone?: string
  device_brand: string
  device_model: string
  status: string
  fault_description?: string
  technician_notes?: string
  private_note?: string
  imei?: string
  actual_cost?: number
  estimated_cost?: number
  device_images?: string[]
  approval_token?: string
  technician_id?: string | null
  metadata?: {
    used_parts?: Array<{ id?: string; stock_id?: string; name?: string; qty?: number; unit_buy?: number; unit_sell?: number }>
    final_checks?: string[]
    expenses?: Array<{ description: string; amount: number }>
  }
}

type Tech = { id: string; full_name: string }

export default function AtolyeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useAppTheme()
  const catalog = usePartsCatalog()

  const [order, setOrder] = useState<Order | null>(null)
  const [notes, setNotes] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [techs, setTechs] = useState<Tech[]>([])
  const [techId, setTechId] = useState<string | null>(null)
  const [usedParts, setUsedParts] = useState<Array<{ stock_id: string; name: string; qty: number; unit_buy: number; unit_sell: number }>>([])
  const [finalChecks, setFinalChecks] = useState<string[]>([])
  const [expenses, setExpenses] = useState<Array<{ description: string; amount: number }>>([])
  const [expDesc, setExpDesc] = useState('')
  const [expAmt, setExpAmt] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  // Bottom Sheet States
  const [statusSheetOpen, setStatusSheetOpen] = useState(false)
  const [partSheetOpen, setPartSheetOpen] = useState(false)
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false)
  const [deliverSheetOpen, setDeliverSheetOpen] = useState(false)

  const hasOrder = useRef(false)

  const load = useCallback(async (): Promise<Order | null> => {
    if (!id) return null
    if (!hasOrder.current) setLoading(true)
    setError('')
    try {
      const [orderJson, _catalogLoaded, techJson] = await Promise.all([
        apiFetch(`/api/service-orders/${id}`) as Promise<{ data: Order }>,
        catalog.ensureLoaded(),
        apiFetch('/api/tenant/technicians').catch(() => ({ items: [] })) as Promise<{ items?: Tech[] }>,
      ])
      const o = orderJson.data
      setOrder(o)
      setNotes(o.technician_notes || '')
      setPrivateNote(o.private_note || '')
      setTechId(o.technician_id || null)
      setTechs(techJson.items ?? [])
      const metaParts = o.metadata?.used_parts ?? []
      setUsedParts(
        metaParts
          .map(p => ({
            stock_id: String(p.stock_id || p.id || ''),
            name: String(p.name || ''),
            qty: Number(p.qty) || 1,
            unit_buy: Number(p.unit_buy) || 0,
            unit_sell: Number(p.unit_sell) || 0,
          }))
          .filter(p => p.stock_id),
      )
      setFinalChecks(Array.isArray(o.metadata?.final_checks) ? o.metadata!.final_checks!.map(String) : [])
      setExpenses(Array.isArray(o.metadata?.expenses) ? o.metadata!.expenses! : [])
      setImages(Array.isArray(o.device_images) ? o.device_images : [])
      hasOrder.current = true
      return o
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt yüklenemedi')
      return null
    } finally {
      setLoading(false)
    }
  }, [id, catalog])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  async function patchOrder(body: Record<string, unknown>): Promise<Order | null> {
    if (!id) return null
    setBusy(true)
    setError('')
    try {
      const json = (await apiFetch(`/api/service-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })) as { data: Order }
      setOrder(json.data)
      setMsg('Değişiklik kaydedildi')
      setTimeout(() => setMsg(''), 3000)
      return json.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Güncelleme başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message)) {
        await enqueueJob({
          path: `/api/service-orders/${id}`,
          method: 'PATCH',
          body,
          label: body.status ? `Durum: ${body.status}` : 'İş güncelle',
        })
        setMsg('Çevrimdışı kuyruğa alındı')
      } else {
        setError(message)
      }
      return null
    } finally {
      setBusy(false)
    }
  }

  // 1-Tap Status Transition with Optimistic UI & Deterministic Rollback
  async function handleStatusChange(newStatus: string) {
    if (!order) return
    const prevStatus = order.status
    // Optimistic Update
    setOrder({ ...order, status: newStatus })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    try {
      const res = await patchOrder({
        status: newStatus,
        technician_notes: notes,
        private_note: privateNote,
        final_checks: finalChecks,
        technician_id: techId,
      })
      if (!res) {
        // Rollback on non-queued failure
        setOrder({ ...order, status: prevStatus })
      }
    } catch {
      setOrder({ ...order, status: prevStatus })
    }
  }

  // 1-Tap Direct Camera Photo Capture & Upload
  async function handleTakePhoto() {
    if (!id) return
    if (images.length >= 10) {
      Alert.alert('Limit', 'En fazla 10 fotoğraf eklenebilir.')
      return
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets?.[0]) return

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setBusy(true)
      const asset = result.assets[0]
      const form = new FormData()
      form.append('file', {
        uri: asset.uri,
        name: `photo-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob)

      const json = (await apiUpload(`/api/service-orders/${id}/photos`, form)) as { images?: string[] }
      if (json.images) {
        setImages(json.images)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setMsg('Fotoğraf eklendi')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fotoğraf yüklenemedi')
    } finally {
      setBusy(false)
    }
  }

  // 2-Click Part Add Handler
  async function handleAddPart(part: { id: string; name: string; purchase_price?: number; sale_price?: number }) {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      const unitBuy = Number(part.purchase_price) || 0
      const unitSell = Number(part.sale_price) || unitBuy
      await apiFetch(`/api/service-orders/${id}/use-parts`, {
        method: 'POST',
        body: JSON.stringify({
          parts: [{ stock_id: part.id, name: part.name, qty: 1, unit_buy: unitBuy, unit_sell: unitSell }],
        }),
      })
      setUsedParts(prev => {
        const ex = prev.find(x => x.stock_id === part.id)
        if (ex) return prev.map(x => (x.stock_id === part.id ? { ...x, qty: x.qty + 1 } : x))
        return [...prev, { stock_id: part.id, name: part.name, qty: 1, unit_buy: unitBuy, unit_sell: unitSell }]
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setMsg(`${part.name} eklendi`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parça eklenemedi')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestorePart(stockId: string) {
    if (!id) return
    setBusy(true)
    try {
      await apiFetch(`/api/service-orders/${id}/restore-parts`, {
        method: 'POST',
        body: JSON.stringify({ parts: [{ stock_id: stockId, qty: 1 }] }),
      })
      setUsedParts(prev =>
        prev
          .map(p => (p.stock_id === stockId ? { ...p, qty: p.qty - 1 } : p))
          .filter(p => p.qty > 0),
      )
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setMsg('Parça stoğa geri alındı')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Geri alınamadı')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeliver(serviceFee: number, paymentMethod: string) {
    if (!id || !order) return
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/service-orders/${id}/deliver`, {
        method: 'POST',
        body: JSON.stringify({
          service_fee: serviceFee,
          payment_method: paymentMethod,
          used_parts: usedParts,
          final_checks: finalChecks,
        }),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Başarılı', 'Cihaz başarıyla teslim edildi ve ödeme kasaya işlendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Teslim işlemi başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message)) {
        await enqueueJob({
          path: `/api/service-orders/${id}/deliver`,
          method: 'POST',
          body: {
            service_fee: serviceFee,
            payment_method: paymentMethod,
            used_parts: usedParts,
            final_checks: finalChecks,
          },
          label: `Teslimat ${order.order_no}`,
        })
        Alert.alert('Çevrimdışı', 'Bağlantı yok — teslimat kuyruğa alındı.')
        router.back()
      } else {
        setError(message)
        throw e
      }
    } finally {
      setBusy(false)
    }
  }

  async function deletePhoto(url: string) {
    if (!id) return
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğraf servis kaydından silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setBusy(true)
          try {
            const json = (await apiFetch(`/api/service-orders/${id}/photos`, {
              method: 'DELETE',
              body: JSON.stringify({ url }),
            })) as { images?: string[] }
            setImages(json.images ?? images.filter(u => u !== url))
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setMsg('Fotoğraf silindi')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Silinemedi')
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  async function toggleQc(item: string) {
    if (isDone) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const next = finalChecks.includes(item) ? finalChecks.filter(x => x !== item) : [...finalChecks, item]
    setFinalChecks(next)

    if (isQcComplete(next)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setOrder(prev => prev ? { ...prev, status: 'kalite_kontrol' } : prev)
      await patchOrder({
        final_checks: next,
        status: 'kalite_kontrol',
        qc_passed: true,
      })
      setMsg('Kalite kontrol tamamlandı (QC PASS) — Cihaz teslime hazır!')
    } else {
      await patchOrder({ final_checks: next })
    }
  }

  async function handleQcPassAll() {
    if (isDone) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setFinalChecks(QC_CHECKLIST)
    setOrder(prev => prev ? { ...prev, status: 'kalite_kontrol' } : prev)
    await patchOrder({
      final_checks: QC_CHECKLIST,
      status: 'kalite_kontrol',
      qc_passed: true,
    })
    setMsg('Tüm testler onaylandı (QC PASS) — Cihaz teslime hazır!')
  }

  async function handleQcFail(reason = 'Kalite kontrol aşamasında problem tespit edildi') {
    if (isDone) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    setOrder(prev => prev ? { ...prev, status: 'tamir' } : prev)
    await patchOrder({
      status: 'tamir',
      qc_passed: false,
      qc_fail_reason: reason,
    })
    setMsg(`QC Başarısız — Cihaz onarıma döndü (${reason})`)
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="Servis detayı yükleniyor…" />
      </View>
    )
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
        <ErrorBanner message={error || 'Kayıt bulunamadı'} onRetry={() => void load()} />
      </View>
    )
  }

  const isDone = order.status === 'teslim' || order.status === 'delivered'
  const qc = qcProgress(finalChecks)
  const orderNo = order.order_no || order.id.slice(0, 8)
  const device = [order.device_brand, order.device_model].filter(Boolean).join(' ') || 'Cihaz'

  return (
    <>
      <Stack.Screen
        options={{
          title: orderNo,
          headerRight: () => (
            <Pressable
              onPress={() => setCustomerSheetOpen(true)}
              hitSlop={8}
              style={[styles.headerIconBtn, { backgroundColor: '#10b98120' }]}
            >
              <FontAwesome name="whatsapp" size={18} color="#10b981" />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Feedback & Error Banner */}
          {error || msg ? (
            <View
              style={[
                styles.feedbackBar,
                {
                  backgroundColor: error ? colors.dangerSoft : colors.successSoft,
                  borderColor: error ? colors.danger : colors.success,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={{ color: error ? colors.danger : colors.success, fontWeight: '700', flex: 1 }}>
                {error || msg}
              </Text>
            </View>
          ) : null}

          {/* Section 1: Customer & Device Overview Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: colors.text }]}>{order.customer_name}</Text>
                <Text style={[styles.deviceTitle, { color: colors.primary }]}>{device}</Text>
              </View>
              <Pressable
                onPress={() => setStatusSheetOpen(true)}
                style={[styles.statusBadge, { backgroundColor: colors.primarySoft }]}
              >
                <Text style={[styles.statusBadgeText, { color: colors.primary }]}>{statusLabel(order.status)}</Text>
                <FontAwesome name="pencil" size={10} color={colors.primary} style={{ marginLeft: 4 }} />
              </Pressable>
            </View>

            <View style={styles.cardMetaRow}>
              {order.customer_phone ? (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  <FontAwesome name="phone" size={12} color={colors.muted} /> {order.customer_phone}
                </Text>
              ) : null}
              {order.imei ? (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  IMEI: <Text style={{ fontWeight: '700', color: colors.text }}>{order.imei}</Text>
                </Text>
              ) : null}
            </View>

            {order.fault_description ? (
              <View style={[styles.faultBox, { backgroundColor: colors.bgElevated, borderRadius: colors.radius }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, marginBottom: 2 }}>ARIZA / ŞİKAYET</Text>
                <Text style={{ color: colors.text, fontSize: 14, lineHeight: 19 }}>{order.fault_description}</Text>
              </View>
            ) : null}
          </View>

          {/* Section 2: Technician Assignment */}
          {!isDone && techs.length > 0 && (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>ATANAN TEKNİSYEN</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {techs.map(t => (
                    <Chip
                      key={t.id}
                      label={t.full_name}
                      active={techId === t.id}
                      onPress={() => {
                        setTechId(t.id)
                        void patchOrder({ technician_id: t.id })
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Section 3: Quality Control Checklist */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.muted, marginBottom: 0 }]}>
                KALİTE KONTROL ({qc.done}/{qc.total})
              </Text>
              <View style={[styles.qcBadge, { backgroundColor: qc.done === qc.total ? colors.successSoft : colors.primarySoft }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: qc.done === qc.total ? colors.success : colors.primary }}>
                  %{Math.round((qc.done / (qc.total || 1)) * 100)}
                </Text>
              </View>
            </View>

            <View style={styles.qcGrid}>
              {QC_CHECKLIST.map(item => {
                const checked = finalChecks.includes(item)
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.qcItem,
                      {
                        backgroundColor: checked ? colors.primarySoft : colors.bgElevated,
                        borderColor: checked ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                      },
                    ]}
                    onPress={() => toggleQc(item)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                  >
                    <FontAwesome
                      name={checked ? 'check-square' : 'square-o'}
                      size={16}
                      color={checked ? colors.primary : colors.muted}
                    />
                    <Text style={[styles.qcText, { color: checked ? colors.text : colors.muted }]}>{item}</Text>
                  </Pressable>
                )
              })}
            </View>

            {!isDone && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Pressable
                  onPress={handleQcPassAll}
                  style={{ flex: 1, backgroundColor: colors.success, paddingVertical: 9, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓ QC PASS (Hazırla)</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleQcFail()}
                  style={{ paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>✕ QC Fail</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Section 4: Used Parts */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.muted, marginBottom: 0 }]}>
                KULLANILAN PARÇALAR ({usedParts.length})
              </Text>
              {!isDone && (
                <Pressable
                  onPress={() => setPartSheetOpen(true)}
                  style={[styles.addBtnPill, { backgroundColor: colors.primarySoft }]}
                >
                  <FontAwesome name="plus" size={11} color={colors.primary} />
                  <Text style={[styles.addBtnPillText, { color: colors.primary }]}>Parça Ekle</Text>
                </Pressable>
              )}
            </View>

            {usedParts.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: 13, paddingVertical: 6 }}>Kayıtlı parça kullanımı yok.</Text>
            ) : (
              usedParts.map(p => (
                <View key={p.stock_id} style={[styles.partRowItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.partNameText, { color: colors.text }]}>{p.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Miktar: <Text style={{ fontWeight: '700', color: colors.text }}>{p.qty} Adet</Text> · Birim:{' '}
                      {Number(p.unit_sell).toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                  {!isDone && (
                    <Pressable
                      onPress={() => void handleRestorePart(p.stock_id)}
                      disabled={busy}
                      style={styles.restoreBtn}
                      hitSlop={6}
                    >
                      <FontAwesome name="trash" size={14} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Section 5: Photos Gallery */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.muted, marginBottom: 0 }]}>
                FOTOĞRAFLAR ({images.length})
              </Text>
              {!isDone && (
                <Pressable
                  onPress={() => void handleTakePhoto()}
                  style={[styles.addBtnPill, { backgroundColor: colors.primarySoft }]}
                >
                  <FontAwesome name="camera" size={11} color={colors.primary} />
                  <Text style={[styles.addBtnPillText, { color: colors.primary }]}>Foto Çek</Text>
                </Pressable>
              )}
            </View>

            {images.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: 13, paddingVertical: 6 }}>Servis öncesi/sonrası fotoğraf eklenmedi.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                  {images.map(uri => (
                    <Pressable key={uri} onLongPress={() => !isDone && void deletePhoto(uri)}>
                      <Image source={{ uri }} style={[styles.photoThumb, { backgroundColor: colors.border }]} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
            {images.length > 0 && !isDone && (
              <Text style={{ fontSize: 11, color: colors.muted }}>Fotoğrafı silmek için üzerine basılı tutun.</Text>
            )}
          </View>

          {/* Section 6: Notes */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>TEKNİSYEN & İÇ NOTLAR</Text>
            <TextField
              label="Teknisyen Notu"
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Yapılan işlemler, değişen bileşenler…"
              editable={!isDone}
            />
            <TextField
              label="Özel Not (Müşteri Görmez)"
              multiline
              value={privateNote}
              onChangeText={setPrivateNote}
              placeholder="İç maliyet veya bayi özel notu…"
              editable={!isDone}
            />
            {!isDone && (
              <Button
                title="Notları Kaydet"
                disabled={busy}
                onPress={() =>
                  void patchOrder({
                    technician_notes: notes,
                    private_note: privateNote,
                    final_checks: finalChecks,
                    technician_id: techId,
                  })
                }
              />
            )}
          </View>

          {/* Section 7: Fast Thermal & Label Actions */}
          <View style={styles.printButtonsRow}>
            <Button
              title="Etiket Yazdır"
              variant="secondary"
              onPress={() =>
                void printLabel({
                  title: orderNo,
                  orderNo,
                  subtitle: `${order.device_brand} ${order.device_model}`,
                })
              }
              style={{ flex: 1 }}
            />
            <Button
              title="Termal Fiş Bas"
              variant="secondary"
              onPress={async () => {
                const res = await printToThermalPrinter({
                  receiptNo: orderNo,
                  customerName: order.customer_name,
                  customerPhone: order.customer_phone || '-',
                  deviceModel: device,
                  serialOrImei: order.imei,
                  problemDescription: order.fault_description || 'Servis Kaydı',
                  receivedDate: new Date().toLocaleDateString('tr-TR'),
                  tenantName: 'AURA İntegra Servis',
                  tenantPhone: '0850 000 0000',
                })
                Alert.alert('Termal Yazıcı', res.message)
              }}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>

        {/* Sticky Action Bar */}
        <ServiceStickyBar
          isDone={isDone}
          busy={busy}
          onOpenStatus={() => setStatusSheetOpen(true)}
          onOpenPart={() => setPartSheetOpen(true)}
          onTakePhoto={() => void handleTakePhoto()}
          onOpenCustomer={() => setCustomerSheetOpen(true)}
          onOpenDeliver={() => setDeliverSheetOpen(true)}
        />

        {/* Modal Sheets */}
        <StatusActionSheet
          visible={statusSheetOpen}
          currentStatus={order.status}
          onSelectStatus={s => void handleStatusChange(s)}
          onClose={() => setStatusSheetOpen(false)}
        />

        <QuickPartSheet
          visible={partSheetOpen}
          onClose={() => setPartSheetOpen(false)}
          onAddPart={p => handleAddPart(p)}
          busy={busy}
        />

        <CustomerActionSheet
          visible={customerSheetOpen}
          order={order}
          onClose={() => setCustomerSheetOpen(false)}
          onRequestApproval={async () => {
            await patchOrder({
              status: 'onay_bekleniyor',
              technician_notes: notes,
              private_note: privateNote,
              final_checks: finalChecks,
            })
          }}
        />

        <DeliverModalSheet
          visible={deliverSheetOpen}
          orderNo={orderNo}
          customerName={order.customer_name}
          initialFee={order.actual_cost ?? order.estimated_cost ?? 0}
          onClose={() => setDeliverSheetOpen(false)}
          onDeliver={(fee, pay) => handleDeliver(fee, pay)}
          busy={busy}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentContainer: { padding: 14, gap: 12 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  feedbackBar: {
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: { padding: 14, borderWidth: 1, gap: 8 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  customerName: { fontSize: 17, fontWeight: '900' },
  deviceTitle: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  cardMetaRow: { flexDirection: 'row', gap: 14, marginTop: 2 },
  faultBox: { padding: 10, marginTop: 4 },
  sectionWrap: { gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  qcBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  qcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  qcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '47%',
  },
  qcText: { fontSize: 12, fontWeight: '700' },
  addBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addBtnPillText: { fontSize: 11, fontWeight: '800' },
  partRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  partNameText: { fontSize: 14, fontWeight: '700' },
  restoreBtn: { padding: 8 },
  photoThumb: { width: 90, height: 90, borderRadius: 12 },
  printButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
})
