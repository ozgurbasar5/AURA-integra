import { useCallback, useState } from 'react'
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
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Constants from 'expo-constants'
import { apiFetch, apiUpload } from '@/lib/api'
import { AuraColors } from '@/constants/AuraColors'
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

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [orderJson, partsJson, techJson] = await Promise.all([
        apiFetch(`/api/service-orders/${id}`) as Promise<{ data: Order }>,
        apiFetch('/api/tenant/parts') as Promise<{ items?: Part[] }>,
        apiFetch('/api/tenant/technicians').catch(() => ({ items: [] })) as Promise<{ items?: Tech[] }>,
      ])
      const o = orderJson.data
      setOrder(o)
      setNotes(o.technician_notes || '')
      setPrivateNote(o.private_note || '')
      setTechId(o.technician_id || null)
      const cost = o.actual_cost ?? o.estimated_cost ?? 0
      setFee(cost ? String(cost) : '')
      setParts((partsJson.items ?? []).filter(p => Number(p.stock_qty) > 0).slice(0, 80))
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function patchOrder(body: Record<string, unknown>) {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      const json = await apiFetch(`/api/service-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }) as { data: Order }
      setOrder(json.data)
      setMsg('Kaydedildi')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Güncelleme başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message) && body.technician_notes != null) {
        await enqueueJob({
          path: `/api/service-orders/${id}`,
          method: 'PATCH',
          body,
          label: 'Teknisyen notu',
        })
        setMsg('Not kuyruğa alındı (çevrimdışı)')
      } else {
        setError(message)
      }
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
      setError(e instanceof Error ? e.message : 'Teslim başarısız')
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
    let token = order.approval_token
    if (!token) {
      try {
        await setStatus('onay_bekleniyor')
        await load()
      } catch { /* */ }
    }
    const o = order
    const link = o.approval_token ? approvalUrl(o.approval_token) : ''
    const feeNum = Number(fee) || o.estimated_cost || 0
    const msgText = `Merhaba ${o.customer_name}, ${o.device_brand} ${o.device_model} için tahmini ücret: ${feeNum} TL. Onay için: ${link || '(link yakında)'}`
    await Linking.openURL(buildWaMeUrl(o.customer_phone, msgText))
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
    setBusy(true)
    try {
      const json = await apiFetch(`/api/service-orders/${id}/photos`, {
        method: 'DELETE',
        body: JSON.stringify({ url }),
      }) as { images?: string[] }
      setImages(json.images ?? images.filter(u => u !== url))
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
    return <View style={styles.center}><ActivityIndicator color={AuraColors.primary} /></View>
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Kayıt yok'}</Text>
      </View>
    )
  }

  const done = order.status === 'teslim' || order.status === 'delivered'
  const qc = qcProgress(finalChecks)

  return (
    <>
      <Stack.Screen options={{ title: order.order_no || 'İş detayı' }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {msg ? <Text style={styles.ok}>{msg}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.title}>{order.customer_name}</Text>
          <Text style={styles.meta}>{order.customer_phone || '—'}</Text>
          <Text style={styles.meta}>
            {[order.device_brand, order.device_model].filter(Boolean).join(' ')}
            {order.imei ? ` · ${order.imei}` : ''}
          </Text>
          <Text style={styles.badge}>{statusLabel(order.status)}</Text>
          {order.fault_description ? <Text style={styles.fault}>{order.fault_description}</Text> : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionBtn, styles.waBtn]} onPress={() => void openWhatsApp()}>
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={() => void shareReceipt()}>
            <Text style={styles.actionBtnText}>Fiş</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.photoBtn]} onPress={() => void sendApprovalWa()}>
            <Text style={styles.actionBtnText}>Onay linki</Text>
          </Pressable>
          {!done && (
            <Pressable style={[styles.actionBtn, styles.photoBtn]} disabled={busy} onPress={() => void pickPhoto()}>
              <Text style={styles.actionBtnText}>Foto</Text>
            </Pressable>
          )}
        </View>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {images.map(uri => (
                <Pressable key={uri} onLongPress={() => !done && void deletePhoto(uri)}>
                  <Image source={{ uri }} style={styles.thumb} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
        {images.length > 0 && !done ? (
          <Text style={styles.hint}>Uzun basarak fotoğraf sil</Text>
        ) : null}

        <Text style={styles.label}>Teknisyen notu</Text>
        <TextInput
          style={styles.input}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Not…"
          placeholderTextColor={AuraColors.muted}
          editable={!done}
        />

        <Text style={styles.label}>Özel not (müşteri görmez)</Text>
        <TextInput
          style={styles.input}
          multiline
          value={privateNote}
          onChangeText={setPrivateNote}
          placeholder="İç not…"
          placeholderTextColor={AuraColors.muted}
          editable={!done}
        />

        {!done && techs.length > 0 && (
          <>
            <Text style={styles.label}>Teknisyen</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {techs.map(t => (
                  <Pressable
                    key={t.id}
                    style={[styles.statusBtn, techId === t.id && styles.statusActive]}
                    onPress={() => setTechId(t.id)}
                  >
                    <Text style={[styles.statusText, techId === t.id && styles.statusTextActive]}>
                      {t.full_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {!done && (
          <>
            <Text style={styles.label}>Durum</Text>
            <View style={styles.statusGrid}>
              {STATUSES.map(s => (
                <Pressable
                  key={s.id}
                  style={[styles.statusBtn, order.status === s.id && styles.statusActive]}
                  disabled={busy}
                  onPress={() => void setStatus(s.id)}
                >
                  <Text style={[styles.statusText, order.status === s.id && styles.statusTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>QC ({qc.done}/{qc.total})</Text>
            {QC_CHECKLIST.map(item => (
              <Pressable key={item} style={styles.qcRow} onPress={() => toggleQc(item)}>
                <Text style={styles.qcCheck}>{finalChecks.includes(item) ? '☑' : '☐'}</Text>
                <Text style={styles.qcText}>{item}</Text>
              </Pressable>
            ))}

            <Text style={styles.label}>Parça ({usedParts.length})</Text>
            {usedParts.map(p => (
              <View key={p.stock_id} style={styles.partRow}>
                <Text style={styles.usedLine}>{p.name} × {p.qty}</Text>
                <Pressable onPress={() => void restorePart(p.stock_id)} disabled={busy}>
                  <Text style={styles.restore}>Geri al</Text>
                </Pressable>
              </View>
            ))}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {parts.slice(0, 20).map(p => (
                  <Pressable key={p.id} style={styles.partChip} disabled={busy} onPress={() => void addPart(p)}>
                    <Text style={styles.partChipText}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Ek gider</Text>
            {expenses.map((e, i) => (
              <Text key={`${e.description}-${i}`} style={styles.usedLine}>
                {e.description}: {e.amount} ₺
              </Text>
            ))}
            <View style={styles.expRow}>
              <TextInput
                style={[styles.inputSingle, { flex: 1 }]}
                placeholder="Açıklama"
                value={expDesc}
                onChangeText={setExpDesc}
                placeholderTextColor={AuraColors.muted}
              />
              <TextInput
                style={[styles.inputSingle, { width: 90 }]}
                placeholder="₺"
                keyboardType="decimal-pad"
                value={expAmt}
                onChangeText={setExpAmt}
                placeholderTextColor={AuraColors.muted}
              />
              <Pressable style={styles.addExp} onPress={() => void addExpense()}>
                <Text style={styles.actionBtnText}>+</Text>
              </Pressable>
            </View>

            <Pressable style={styles.saveBtn} disabled={busy} onPress={() => void saveAll()}>
              <Text style={styles.deliverText}>Kaydet</Text>
            </Pressable>

            <Text style={styles.label}>Teslim ücreti (₺)</Text>
            <TextInput
              style={styles.inputSingle}
              keyboardType="decimal-pad"
              value={fee}
              onChangeText={setFee}
              placeholder="0"
              placeholderTextColor={AuraColors.muted}
            />
            <Text style={styles.label}>Ödeme</Text>
            <View style={styles.statusGrid}>
              {PAYMENTS.map(p => (
                <Pressable
                  key={p.id}
                  style={[styles.statusBtn, payment === p.id && styles.statusActive]}
                  onPress={() => setPayment(p.id)}
                >
                  <Text style={[styles.statusText, payment === p.id && styles.statusTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.deliverBtn} disabled={busy} onPress={() => void deliver()}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deliverText}>Teslim Et</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: AuraColors.danger, fontWeight: '600' },
  ok: { color: AuraColors.success, fontWeight: '600' },
  hint: { fontSize: 11, color: AuraColors.muted },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 4,
  },
  title: { fontWeight: '800', fontSize: 18, color: AuraColors.text },
  meta: { color: AuraColors.muted, fontSize: 13 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: AuraColors.primarySoft,
    color: AuraColors.primary,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  fault: { marginTop: 8, color: AuraColors.text },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  waBtn: { backgroundColor: '#16a34a' },
  shareBtn: { backgroundColor: AuraColors.primaryDark },
  photoBtn: { backgroundColor: AuraColors.primary },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: AuraColors.border },
  label: { fontSize: 11, fontWeight: '700', color: AuraColors.muted, textTransform: 'uppercase', marginTop: 4 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: AuraColors.card,
    textAlignVertical: 'top',
    color: AuraColors.text,
  },
  inputSingle: {
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: AuraColors.card,
    color: AuraColors.text,
    fontWeight: '700',
  },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: AuraColors.card,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  statusActive: { backgroundColor: AuraColors.primary, borderColor: AuraColors.primary },
  statusText: { fontWeight: '700', color: AuraColors.text, fontSize: 13 },
  statusTextActive: { color: '#fff' },
  qcRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  qcCheck: { fontSize: 16, color: AuraColors.primary },
  qcText: { color: AuraColors.text, fontSize: 13, flex: 1 },
  usedLine: { color: AuraColors.text, fontSize: 13 },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restore: { color: AuraColors.danger, fontWeight: '700', fontSize: 12 },
  partChip: {
    backgroundColor: AuraColors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  partChipText: { color: AuraColors.primary, fontWeight: '700', fontSize: 12 },
  expRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addExp: {
    backgroundColor: AuraColors.primary,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: AuraColors.primaryDark,
    borderRadius: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliverBtn: {
    backgroundColor: AuraColors.success,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliverText: { color: '#fff', fontWeight: '800' },
})
