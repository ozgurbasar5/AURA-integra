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
import Constants from 'expo-constants'
import { apiFetch, apiUpload } from '@/lib/api'
import { usePartsCatalog } from '@/lib/PartsCatalog'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { statusLabel } from '@/lib/status-labels'
import { buildServiceReceiptText, buildWaMeUrl } from '@/lib/wa'
import { QC_CHECKLIST, qcProgress } from '@/lib/qc'
import { enqueueJob } from '@/lib/offline-queue'

const STATUSES = [
  { id: 'alindi', label: 'Alındı' },
  { id: 'teshis', label: 'Teşhis' },
  { id: 'onay_bekleniyor', label: 'Onay' },
  { id: 'tamir', label: 'Tamir' },
  { id: 'parts_waiting', label: 'Parça' },
  { id: 'kalite_kontrol', label: 'Kalite' },
]

const PAYMENTS = [
  { id: 'nakit', label: 'Nakit' },
  { id: 'kredi_karti', label: 'Kart' },
  { id: 'havale', label: 'Havale' },
  { id: 'veresiye', label: 'Veresiye' },
]

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

type Part = {
  id: string
  name: string
  stock_qty: number
  purchase_price?: number
  sale_price?: number
}

type Tech = { id: string; full_name: string }

function approvalUrl(token: string): string {
  const base =
    (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
    'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/onay/${token}`
}

export default function AtolyeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useAppTheme()
  const catalog = usePartsCatalog()
  const [order, setOrder] = useState<Order | null>(null)
  const [notes, setNotes] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [fee, setFee] = useState('')
  const [payment, setPayment] = useState('nakit')
  const [parts, setParts] = useState<Part[]>([])
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
  const hasOrder = useRef(false)

  const load = useCallback(async (): Promise<Order | null> => {
    if (!id) return null
    if (!hasOrder.current) setLoading(true)
    setError('')
    try {
      const [orderJson, catalogParts, techJson] = await Promise.all([
        apiFetch(`/api/service-orders/${id}`) as Promise<{ data: Order }>,
        catalog.ensureLoaded(),
        apiFetch('/api/tenant/technicians').catch(() => ({ items: [] })) as Promise<{ items?: Tech[] }>,
      ])
      const o = orderJson.data
      setOrder(o)
      setNotes(o.technician_notes || '')
      setPrivateNote(o.private_note || '')
      setTechId(o.technician_id || null)
      const cost = o.actual_cost ?? o.estimated_cost ?? 0
      setFee(cost ? String(cost) : '')
      setParts(catalogParts.filter(p => Number(p.stock_qty) > 0).slice(0, 80).map(p => ({
        id: p.id,
        name: p.name,
        stock_qty: p.stock_qty,
        purchase_price: p.buy_price,
        sale_price: p.sale_price ?? p.sell_price,
      })))
      setTechs(techJson.items ?? [])
      const metaParts = o.metadata?.used_parts ?? []
      setUsedParts(metaParts.map(p => ({
        stock_id: String(p.stock_id || p.id || ''),
        name: String(p.name || ''),
        qty: Number(p.qty) || 1,
        unit_buy: Number(p.unit_buy) || 0,
        unit_sell: Number(p.unit_sell) || 0,
      })).filter(p => p.stock_id))
      setFinalChecks(Array.isArray(o.metadata?.final_checks) ? o.metadata!.final_checks!.map(String) : [])
      setExpenses(Array.isArray(o.metadata?.expenses) ? o.metadata!.expenses! : [])
      setImages(Array.isArray(o.device_images) ? o.device_images : [])
      hasOrder.current = true
      return o
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
      return null
    } finally {
      setLoading(false)
    }
  }, [id, catalog])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function patchOrder(body: Record<string, unknown>): Promise<Order | null> {
    if (!id) return null
    setBusy(true)
    setError('')
    try {
      const json = await apiFetch(`/api/service-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { data: Order }
      setOrder(json.data)
      setMsg('Kaydedildi')
      return json.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Güncelleme başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message)) {
        await enqueueJob({
          path: `/api/service-orders/${id}`,
          method: 'PATCH',
          body,
          label: body.status ? 'Durum güncelle' : 'İş güncelle',
        })
        setMsg('Kuyruğa alındı (çevrimdışı)')
      } else {
        setError(message)
      }
      return null
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: string) {
    await patchOrder({
      status,
      technician_notes: notes,
      private_note: privateNote,
      final_checks: finalChecks,
      technician_id: techId,
    })
  }

  async function saveAll() {
    await patchOrder({
      technician_notes: notes,
      private_note: privateNote,
      final_checks: finalChecks,
      technician_id: techId,
      actual_cost: Number(fee) || undefined,
      used_parts: usedParts,
    })
  }

  async function addPart(p: Part) {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      const unitBuy = Number(p.purchase_price) || 0
      const unitSell = Number(p.sale_price) || unitBuy
      await apiFetch(`/api/service-orders/${id}/use-parts`, {
        method: 'POST',
        body: JSON.stringify({
          parts: [{ stock_id: p.id, name: p.name, qty: 1, unit_buy: unitBuy, unit_sell: unitSell }],
        }),
      })
      setUsedParts(prev => {
        const ex = prev.find(x => x.stock_id === p.id)
        if (ex) return prev.map(x => x.stock_id === p.id ? { ...x, qty: x.qty + 1 } : x)
        return [...prev, { stock_id: p.id, name: p.name, qty: 1, unit_buy: unitBuy, unit_sell: unitSell }]
      })
      setMsg(`${p.name} eklendi`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parça düşülemedi')
    } finally {
      setBusy(false)
    }
  }

  async function restorePart(stockId: string) {
    if (!id) return
    setBusy(true)
    try {
      await apiFetch(`/api/service-orders/${id}/restore-parts`, {
        method: 'POST',
        body: JSON.stringify({ parts: [{ stock_id: stockId, qty: 1 }] }),
      })
      setMsg('Parça geri alındı')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Geri alınamadı')
    } finally {
      setBusy(false)
    }
  }

  async function addExpense() {
    const amount = Number(expAmt)
    if (!expDesc.trim() || !amount) {
      setError('Gider açıklama ve tutar girin')
      return
    }
    const next = [...expenses, { description: expDesc.trim(), amount }]
    setExpenses(next)
    setExpDesc('')
    setExpAmt('')
    await patchOrder({
      technician_notes: notes,
      private_note: privateNote,
      final_checks: finalChecks,
      expenses: next,
    })
  }

  async function deliver() {
    if (!id || !order) return
    const serviceFee = Number(fee)
    if (!serviceFee || serviceFee <= 0) {
      setError('Teslim için ücret girin')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/service-orders/${id}/deliver`, {
        method: 'POST',
        body: JSON.stringify({
          service_fee: serviceFee,
          payment_method: payment,
          used_parts: usedParts,
          final_checks: finalChecks,
        }),
      })
      setMsg('Teslim edildi')
      router.back()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Teslim başarısız'
      const deliverBody = {
        service_fee: serviceFee,
        payment_method: payment,
        used_parts: usedParts,
        final_checks: finalChecks,
      }
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message)) {
        await enqueueJob({
          path: `/api/service-orders/${id}/deliver`,
          method: 'POST',
          body: deliverBody,
          label: 'Teslim',
        })
        setMsg('Teslim kuyruğa alındı — senkron sonrası tamamlanır')
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  async function openWhatsApp() {
    if (!order?.customer_phone) {
      Alert.alert('Telefon yok', 'Müşteri telefonu kayıtlı değil.')
      return
    }
    const text = buildServiceReceiptText({ ...order, status: statusLabel(order.status) })
    await Linking.openURL(buildWaMeUrl(order.customer_phone, text))
  }

  async function sendApprovalWa() {
    if (!order?.customer_phone) {
      Alert.alert('Telefon yok')
      return
    }
    let current = order
    if (!current.approval_token) {
      const updated = await patchOrder({
        status: 'onay_bekleniyor',
        technician_notes: notes,
        private_note: privateNote,
        final_checks: finalChecks,
        technician_id: techId,
      })
      if (updated?.approval_token) {
        current = updated
      } else {
        const reloaded = await load()
        if (reloaded) current = reloaded
      }
    }
    const link = current.approval_token ? approvalUrl(current.approval_token) : ''
    const feeNum = Number(fee) || current.estimated_cost || 0
    if (!link) {
      Alert.alert('Onay linki yok', 'Bu iş için henüz onay token\'ı oluşmamış. Önce kaydı güncelleyin veya web\'den onay linki oluşturun.')
      return
    }
    const msgText = `Merhaba ${current.customer_name}, ${current.device_brand} ${current.device_model} için tahmini ücret: ${feeNum} TL. Onay için: ${link}`
    await Linking.openURL(buildWaMeUrl(current.customer_phone || '', msgText))
  }

  async function shareReceipt() {
    if (!order) return
    await Share.share({
      message: buildServiceReceiptText({ ...order, status: statusLabel(order.status) }),
      title: order.order_no,
    })
  }

  async function pickPhoto() {
    if (!id || images.length >= 8) {
      setError('En fazla 8 fotoğraf')
      return
    }
    Alert.alert('Fotoğraf', 'Kaynak seçin', [
      { text: 'Kamera', onPress: () => void takePhoto('camera') },
      { text: 'Galeri', onPress: () => void takePhoto('library') },
      { text: 'İptal', style: 'cancel' },
    ])
  }

  async function takePhoto(source: 'camera' | 'library') {
    if (!id) return
    setBusy(true)
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, mediaTypes: ['images'] })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      const form = new FormData()
      form.append('file', {
        uri: asset.uri,
        name: `photo-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob)
      const json = await apiUpload(`/api/service-orders/${id}/photos`, form) as { images?: string[] }
      if (json.images) setImages(json.images)
      setMsg('Fotoğraf yüklendi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fotoğraf yüklenemedi')
    } finally {
      setBusy(false)
    }
  }

  async function deletePhoto(url: string) {
    if (!id) return
    Alert.alert('Fotoğrafı sil', 'Bu fotoğraf kalıcı olarak silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => void confirmDeletePhoto(url),
      },
    ])
  }

  async function confirmDeletePhoto(url: string) {
    if (!id) return
    setBusy(true)
    try {
      const json = await apiFetch(`/api/service-orders/${id}/photos`, {
        method: 'DELETE',
        body: JSON.stringify({ url }),
      }) as { images?: string[] }
      setImages(json.images ?? images.filter(u => u !== url))
      setMsg('Fotoğraf silindi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  function toggleQc(item: string) {
    setFinalChecks(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item],
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="İş detayı yükleniyor…" />
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

  const done = order.status === 'teslim' || order.status === 'delivered'
  const qc = qcProgress(finalChecks)
  const label = { fontSize: 11, fontWeight: '700' as const, color: colors.muted, textTransform: 'uppercase' as const, marginTop: 4 }

  return (
    <>
      <Stack.Screen options={{ title: order.order_no || 'İş detayı' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        {(error || msg) ? (
          <View style={[styles.feedbackBar, {
            backgroundColor: error ? colors.dangerSoft : colors.successSoft,
            borderColor: error ? colors.danger : colors.success,
            borderRadius: colors.radius,
          }]}>
            <Text style={{ color: error ? colors.danger : colors.success, fontWeight: '700', flex: 1 }}>
              {error || msg}
            </Text>
            {error ? (
              <Pressable onPress={() => void load()} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>Tekrar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{order.customer_name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{order.customer_phone || '—'}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {[order.device_brand, order.device_model].filter(Boolean).join(' ')}
            {order.imei ? ` · ${order.imei}` : ''}
          </Text>
          <Text style={[styles.badge, { backgroundColor: colors.primarySoft, color: colors.primary }]}>{statusLabel(order.status)}</Text>
          {order.fault_description ? <Text style={{ marginTop: 8, color: colors.text }}>{order.fault_description}</Text> : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#16a34a', borderRadius: colors.radius }]} onPress={() => void openWhatsApp()}>
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.primaryDark, borderRadius: colors.radius }]} onPress={() => void shareReceipt()}>
            <Text style={styles.actionBtnText}>Fiş</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={() => void sendApprovalWa()}>
            <Text style={styles.actionBtnText}>Onay linki</Text>
          </Pressable>
          {!done && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]} disabled={busy} onPress={() => void pickPhoto()}>
              <Text style={styles.actionBtnText}>Foto</Text>
            </Pressable>
          )}
        </View>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {images.map(uri => (
                <Pressable key={uri} onLongPress={() => !done && void deletePhoto(uri)}>
                  <Image source={{ uri }} style={[styles.thumb, { backgroundColor: colors.border }]} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
        {images.length > 0 && !done ? (
          <Text style={{ fontSize: 11, color: colors.muted }}>Uzun basarak fotoğraf sil</Text>
        ) : null}

        <TextField
          label="Teknisyen notu"
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Not…"
          editable={!done}
          style={styles.multiline}
        />

        <TextField
          label="Özel not (müşteri görmez)"
          multiline
          value={privateNote}
          onChangeText={setPrivateNote}
          placeholder="İç not…"
          editable={!done}
          style={styles.multiline}
        />

        {!done && techs.length > 0 && (
          <>
            <Text style={label}>Teknisyen</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {techs.map(t => (
                  <Chip
                    key={t.id}
                    label={t.full_name}
                    active={techId === t.id}
                    onPress={() => setTechId(t.id)}
                  />
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {!done && (
          <>
            <Text style={label}>Durum</Text>
            <View style={styles.statusGrid}>
              {STATUSES.map(s => (
                <Chip
                  key={s.id}
                  label={s.label}
                  active={order.status === s.id}
                  disabled={busy}
                  onPress={() => void setStatus(s.id)}
                />
              ))}
            </View>

            <Text style={label}>QC ({qc.done}/{qc.total})</Text>
            {QC_CHECKLIST.map(item => {
              const checked = finalChecks.includes(item)
              return (
              <Pressable
                key={item}
                style={styles.qcRow}
                onPress={() => toggleQc(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={item}
              >
                <Text style={{ fontSize: 16, color: colors.primary }}>{checked ? '☑' : '☐'}</Text>
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{item}</Text>
              </Pressable>
            )})}

            <Text style={label}>Parça ({usedParts.length})</Text>
            {usedParts.map(p => (
              <View key={p.stock_id} style={styles.partRow}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{p.name} × {p.qty}</Text>
                <Pressable onPress={() => void restorePart(p.stock_id)} disabled={busy}>
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 12 }}>Geri al</Text>
                </Pressable>
              </View>
            ))}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {parts.slice(0, 20).map(p => (
                  <Pressable
                    key={p.id}
                    style={[styles.partChip, { backgroundColor: colors.primarySoft }]}
                    disabled={busy}
                    onPress={() => void addPart(p)}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={label}>Ek gider</Text>
            {expenses.map((e, i) => (
              <Text key={`${e.description}-${i}`} style={{ color: colors.text, fontSize: 13 }}>
                {e.description}: {e.amount} ₺
              </Text>
            ))}
            <View style={styles.expRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder="Açıklama"
                  value={expDesc}
                  onChangeText={setExpDesc}
                />
              </View>
              <View style={{ width: 90 }}>
                <TextField
                  placeholder="₺"
                  keyboardType="decimal-pad"
                  value={expAmt}
                  onChangeText={setExpAmt}
                />
              </View>
              <Pressable
                style={[styles.addExp, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => void addExpense()}
              >
                <Text style={styles.actionBtnText}>+</Text>
              </Pressable>
            </View>

            <Button
              title="Kaydet"
              disabled={busy}
              onPress={() => void saveAll()}
              style={{ backgroundColor: colors.primaryDark }}
            />

            <TextField
              label="Teslim ücreti (₺)"
              keyboardType="decimal-pad"
              value={fee}
              onChangeText={setFee}
              placeholder="0"
            />
            <Text style={label}>Ödeme</Text>
            <View style={styles.statusGrid}>
              {PAYMENTS.map(p => (
                <Chip
                  key={p.id}
                  label={p.label}
                  active={payment === p.id}
                  onPress={() => setPayment(p.id)}
                />
              ))}
            </View>
            <Button
              title="Teslim Et"
              loading={busy}
              onPress={() => void deliver()}
              style={{ backgroundColor: colors.success }}
            />
          </>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  feedbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  thumb: { width: 88, height: 88, borderRadius: 12 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qcRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  expRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  addExp: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
