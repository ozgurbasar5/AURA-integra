import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { apiFetch, apiUpload } from '@/lib/api'
import { enqueueJob, flushQueue, listQueuedJobs } from '@/lib/offline-queue'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { AuraColors } from '@/constants/AuraColors'
import { printLabel } from '@/lib/label-print'

type Order = {
  id: string
  order_no: string | null
  customer_name: string | null
  device_brand: string | null
  device_model: string | null
  status: string | null
  created_at: string | null
}

const empty = {
  customer_name: '',
  customer_phone: '',
  device_brand: '',
  device_model: '',
  imei: '',
  fault_description: '',
}

export default function KabulScreen() {
  const { profile } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<Order[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [success, setSuccess] = useState<{ id: string; order_no: string; tracking?: string } | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [queued, setQueued] = useState(0)
  const [imeiScanOpen, setImeiScanOpen] = useState(false)

  useEffect(() => {
    if (!showForm) return
    const digits = form.customer_phone.replace(/\D/g, '')
    if (historyTimer.current) clearTimeout(historyTimer.current)
    if (digits.length < 10) {
      setHistory([])
      return
    }
    historyTimer.current = setTimeout(async () => {
      setHistoryLoading(true)
      try {
        const q = encodeURIComponent(digits.slice(-10))
        const json = await apiFetch(`/api/service-orders?search=${q}&limit=6`) as { data?: Order[] }
        const rows = json.data ?? []
        setHistory(rows)
        const name = rows.find(r => r.customer_name)?.customer_name
        if (name && !form.customer_name.trim()) {
          setForm(f => ({ ...f, customer_name: name }))
        }
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    }, 400)
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current)
    }
  }, [form.customer_phone, showForm])

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return
    setError('')
    setLoading(true)
    try {
      const flushed = await flushQueue()
      if (flushed.ok > 0) setError('')
      setQueued((await listQueuedJobs()).length)
      const { data, error: qErr } = await supabase
        .from('service_orders')
        .select('id, order_no, customer_name, device_brand, device_model, status, created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(40)
      if (qErr) throw qErr
      setItems((data as Order[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
      setQueued((await listQueuedJobs()).length)
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function createOrder() {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError('Müşteri adı ve telefon zorunlu')
      return
    }
    if (!form.device_brand.trim() || !form.device_model.trim()) {
      setError('Cihaz marka/model zorunlu')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      device_brand: form.device_brand.trim(),
      device_model: form.device_model.trim(),
      imei: form.imei.trim() || undefined,
      fault_description: form.fault_description.trim() || 'Mobil kabul',
      status: 'alindi',
    }
    try {
      const created = await apiFetch('/api/service-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }) as { data?: { id?: string; order_no?: string; tracking_code?: string } }
      const id = String(created.data?.id || '')
      const orderNo = String(created.data?.order_no || '')
      const tracking = created.data?.tracking_code
        ? String(created.data.tracking_code)
        : orderNo
      setForm(empty)
      setShowForm(false)
      await load()
      if (id) {
        setSuccess({ id, order_no: orderNo || id.slice(0, 8), tracking })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(msg)) {
        await enqueueJob({
          path: '/api/service-orders',
          method: 'POST',
          body: payload,
          label: `Kabul ${payload.customer_name}`,
        })
        setQueued((await listQueuedJobs()).length)
        setForm(empty)
        setShowForm(false)
        Alert.alert('Çevrimdışı kuyruk', 'Bağlantı yok — kabul kuyruğa alındı. İnternet gelince otomatik gönderilir.')
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  async function addSuccessPhoto() {
    if (!success?.id) return
    setPhotoBusy(true)
    try {
      Alert.alert('Fotoğraf', 'Kaynak seçin', [
        {
          text: 'Kamera',
          onPress: () => void uploadPhoto('camera'),
        },
        {
          text: 'Galeri',
          onPress: () => void uploadPhoto('library'),
        },
        { text: 'İptal', style: 'cancel', onPress: () => setPhotoBusy(false) },
      ])
    } catch {
      setPhotoBusy(false)
    }
  }

  async function uploadPhoto(source: 'camera' | 'library') {
    if (!success?.id) return
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, mediaTypes: ['images'] })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        name: `kabul-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob)
      await apiUpload(`/api/service-orders/${success.id}/photos`, formData)
      Alert.alert('Tamam', 'Fotoğraf eklendi')
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (loading && items.length === 0) {
    return <View style={styles.center}><ActivityIndicator color={AuraColors.primary} /></View>
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.hint}>Son servis kayıtları{queued > 0 ? ` · kuyruk: ${queued}` : ''}</Text>
        <Pressable style={styles.newBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.newBtnText}>+ Yeni Kabul</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>Kayıt yok</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/atolye/${item.id}`)}>
            <Text style={styles.title}>{item.order_no || item.id.slice(0, 8)}</Text>
            <Text style={styles.sub}>{item.customer_name || 'Müşteri'}</Text>
            <Text style={styles.meta}>
              {[item.device_brand, item.device_model].filter(Boolean).join(' ') || 'Cihaz'} · {item.status || '—'}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!success} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Kabul alındı</Text>
            <Text style={styles.successNo}>{success?.order_no}</Text>
            {success?.tracking ? (
              <Text style={styles.successTrack}>Takip: {success.tracking}</Text>
            ) : null}
            <Pressable style={styles.successPhoto} disabled={photoBusy} onPress={() => void addSuccessPhoto()}>
              {photoBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.successPrimaryText}>Fotoğraf ekle</Text>}
            </Pressable>
            <Pressable
              style={styles.successPhoto}
              onPress={() => {
                if (!success) return
                void printLabel({
                  title: success.order_no,
                  orderNo: success.order_no,
                  subtitle: 'Servis kabul',
                })
              }}
            >
              <Text style={styles.successPrimaryText}>Etiket yazdır</Text>
            </Pressable>
            <Pressable
              style={styles.successPrimary}
              onPress={() => {
                const id = success?.id
                setSuccess(null)
                if (id) router.push(`/atolye/${id}`)
              }}
            >
              <Text style={styles.successPrimaryText}>Atölyeye git</Text>
            </Pressable>
            <Pressable style={styles.successSecondary} onPress={() => setSuccess(null)}>
              <Text style={styles.successSecondaryText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.formTitle}>Yeni Servis Kabul</Text>
          {(['customer_name', 'customer_phone', 'device_brand', 'device_model', 'imei', 'fault_description'] as const).map(key => (
            <View key={key}>
              <Text style={styles.label}>
                {{
                  customer_name: 'Müşteri adı',
                  customer_phone: 'Telefon',
                  device_brand: 'Marka',
                  device_model: 'Model',
                  imei: 'IMEI',
                  fault_description: 'Arıza / not',
                }[key]}
              </Text>
              {key === 'imei' ? (
                <View style={styles.imeiRow}>
                  <TextInput
                    style={[styles.input, styles.imeiInput]}
                    value={form.imei}
                    onChangeText={t => setForm(f => ({ ...f, imei: t }))}
                    placeholderTextColor={AuraColors.muted}
                    keyboardType="phone-pad"
                  />
                  <Pressable style={styles.scanBtn} onPress={() => setImeiScanOpen(true)}>
                    <Text style={styles.scanBtnText}>Tara</Text>
                  </Pressable>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={form[key]}
                  onChangeText={t => setForm(f => ({ ...f, [key]: t }))}
                  placeholderTextColor={AuraColors.muted}
                  keyboardType={key === 'customer_phone' ? 'phone-pad' : 'default'}
                />
              )}
              {key === 'customer_phone' && (historyLoading || history.length > 0) ? (
                <View style={styles.historyBox}>
                  <Text style={styles.historyTitle}>
                    {historyLoading ? 'Geçmiş aranıyor…' : `Bu müşteri · ${history.length} iş`}
                  </Text>
                  {history.map(h => (
                    <Pressable
                      key={h.id}
                      onPress={() => {
                        setShowForm(false)
                        router.push(`/atolye/${h.id}`)
                      }}
                    >
                      <Text style={styles.historyLine}>
                        {h.order_no || h.id.slice(0, 8)} · {[h.device_brand, h.device_model].filter(Boolean).join(' ')} · {h.status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          <Pressable style={styles.save} onPress={() => void createOrder()} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Kaydet</Text>}
          </Pressable>
          <Pressable style={styles.cancel} onPress={() => setShowForm(false)}>
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
        </ScrollView>
      </Modal>

      <BarcodeScannerModal
        visible={imeiScanOpen}
        onClose={() => setImeiScanOpen(false)}
        onScan={(data) => setForm(f => ({ ...f, imei: data }))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  hint: { color: AuraColors.muted, fontSize: 12 },
  newBtn: { backgroundColor: AuraColors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  error: { color: AuraColors.danger, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: AuraColors.muted, marginTop: 40 },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  title: { fontWeight: '800', color: AuraColors.text },
  sub: { color: AuraColors.text, marginTop: 2 },
  meta: { color: AuraColors.muted, fontSize: 12, marginTop: 4 },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: AuraColors.card,
    borderRadius: 18,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: AuraColors.border,
  },
  successTitle: { fontWeight: '800', color: AuraColors.text, fontSize: 16 },
  successNo: { fontWeight: '900', fontSize: 24, color: AuraColors.primary },
  successTrack: { color: AuraColors.muted, fontSize: 13 },
  successPhoto: {
    marginTop: 4,
    backgroundColor: AuraColors.primaryDark,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPrimary: {
    backgroundColor: AuraColors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPrimaryText: { color: '#fff', fontWeight: '800' },
  successSecondary: { alignItems: 'center', paddingVertical: 10 },
  successSecondaryText: { color: AuraColors.muted, fontWeight: '700' },
  form: { padding: 20, gap: 10, backgroundColor: AuraColors.bg },
  formTitle: { fontSize: 20, fontWeight: '900', color: AuraColors.text, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: AuraColors.muted, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: AuraColors.card,
    color: AuraColors.text,
    marginBottom: 4,
  },
  imeiRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  imeiInput: { flex: 1, marginBottom: 0 },
  scanBtn: {
    backgroundColor: AuraColors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  save: {
    marginTop: 12,
    backgroundColor: AuraColors.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800' },
  cancel: { alignItems: 'center', padding: 12 },
  cancelText: { color: AuraColors.muted, fontWeight: '600' },
  historyBox: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  historyTitle: { fontSize: 11, fontWeight: '800', color: AuraColors.primary },
  historyLine: { fontSize: 12, color: AuraColors.text },
})
