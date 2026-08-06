import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { apiFetch, apiUpload } from '@/lib/api'
import { enqueueJob, listQueuedJobs } from '@/lib/offline-queue'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { printLabel } from '@/lib/label-print'
import { printToThermalPrinter } from '@/lib/thermal-printer'

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
  const { colors } = useAppTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ phone?: string | string[]; name?: string | string[] }>()
  const prefillHandled = useRef(false)
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
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
  const hasItems = useRef(false)

  useEffect(() => {
    const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone
    const name = Array.isArray(params.name) ? params.name[0] : params.name
    if (!phone && !name) return
    if (prefillHandled.current) return
    prefillHandled.current = true
    setForm(f => ({
      ...f,
      customer_phone: phone || f.customer_phone,
      customer_name: name || f.customer_name,
    }))
    setShowForm(true)
  }, [params.phone, params.name])

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

  const load = useCallback(async (isRefresh = false) => {
    if (!profile?.tenant_id) {
      setLoading(false)
      setError(profile ? 'Bayi hesabı bağlı değil' : 'Profil bekleniyor — yenileyin')
      return
    }
    setError('')
    if (!hasItems.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      setQueued((await listQueuedJobs()).length)
      try {
        const json = await apiFetch('/api/service-orders?limit=40') as { data?: Order[] }
        setItems(json.data ?? [])
      } catch {
        const { data, error: qErr } = await supabase
          .from('service_orders')
          .select('id, order_no, customer_name, device_brand, device_model, status, created_at')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(40)
        if (qErr) throw qErr
        setItems((data as Order[]) ?? [])
      }
      hasItems.current = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
      setQueued((await listQueuedJobs()).length)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile, profile?.tenant_id])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  async function createOrder() {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setFormError('Müşteri adı ve telefon zorunlu')
      return
    }
    if (!form.device_brand.trim() || !form.device_model.trim()) {
      setFormError('Cihaz marka/model zorunlu')
      return
    }
    setSaving(true)
    setFormError('')
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setSuccess({ id, order_no: orderNo || id.slice(0, 8), tracking })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu|zaman aşımı/i.test(msg)) {
        await enqueueJob({
          path: '/api/service-orders',
          method: 'POST',
          body: payload,
          label: `Kabul ${payload.customer_name}`,
        })
        setQueued((await listQueuedJobs()).length)
        setForm(empty)
        setShowForm(false)
        setSuccess({
          id: '',
          order_no: payload.customer_name.slice(0, 12),
          tracking: 'Kuyrukta',
        })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        Alert.alert('Çevrimdışı kuyruk', 'Bağlantı yok — kabul kuyruğa alındı. İnternet gelince otomatik gönderilir.')
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setFormError(msg)
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
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false, allowsMultipleSelection: true, mediaTypes: ['images'] })
      
      if (result.canceled || !result.assets?.length) return
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      
      // Upload all selected photos sequentially
      for (const asset of result.assets) {
        const formData = new FormData()
        formData.append('file', {
          uri: asset.uri,
          name: `kabul-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as unknown as Blob)
        await apiUpload(`/api/service-orders/${success.id}/photos`, formData)
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Tamam', `${result.assets.length} fotoğraf eklendi`)
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (loading && items.length === 0) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><LoadingBlock label="Kabul listesi…" /></View>
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.top}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Son {items.length} kayıt{queued > 0 ? ` · kuyruk: ${queued}` : ''}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.newBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => { setFormError(''); setShowForm(true) }}
        >
          <Text style={styles.newBtnText}>+ Yeni Kabul</Text>
        </Pressable>
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true)} /> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard"
            title="Henüz kabul yok"
            subtitle="Yeni servis kaydı oluşturun"
            actionLabel="+ Yeni Kabul"
            onAction={() => { setFormError(''); setShowForm(true) }}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.order_no || item.id.slice(0, 8)}
            subtitle={item.customer_name || 'Müşteri'}
            meta={`${[item.device_brand, item.device_model].filter(Boolean).join(' ') || 'Cihaz'} · ${item.status || '—'}`}
            chevron
            onPress={() => router.push(`/atolye/${item.id}`)}
          />
        )}
      />

      <Modal visible={!!success} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>Kabul alındı</Text>
            <Text style={{ fontWeight: '900', fontSize: 24, color: colors.primary }}>{success?.order_no}</Text>
            {success?.tracking ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {success.tracking === 'Kuyrukta' ? 'Çevrimdışı kuyrukta — senkron sonrası atölye/fotoğraf' : `Takip: ${success.tracking}`}
              </Text>
            ) : null}
            {success?.id ? (
              <>
                <Button
                  title="Fotoğraf ekle"
                  variant="secondary"
                  loading={photoBusy}
                  onPress={() => void addSuccessPhoto()}
                />
                <Button
                  title="Etiket yazdır"
                  variant="secondary"
                  onPress={() => {
                    if (!success) return
                    void printLabel({
                      title: success.order_no,
                      orderNo: success.order_no,
                      subtitle: 'Servis kabul',
                    })
                  }}
                />
                <Button
                  title="Bluetooth Fiş Bas"
                  variant="secondary"
                  onPress={async () => {
                    if (!success) return
                    const res = await printToThermalPrinter({
                      receiptNo: success.order_no,
                      customerName: form.customer_name || 'Müşteri',
                      customerPhone: form.customer_phone || '-',
                      deviceModel: `${form.device_brand} ${form.device_model}`.trim(),
                      serialOrImei: form.imei,
                      problemDescription: form.fault_description || 'Servis Kabul',
                      receivedDate: new Date().toLocaleDateString('tr-TR'),
                      tenantName: profile?.full_name || 'AURA İntegra Bayi',
                      tenantPhone: '0850 000 0000',
                    })
                    Alert.alert('Termal Yazıcı', res.message)
                  }}
                />
                <Button
                  title="Atölyeye git"
                  onPress={() => {
                    const id = success?.id
                    setSuccess(null)
                    if (id) router.push(`/atolye/${id}`)
                  }}
                />
              </>
            ) : null}
            <Button title="Kapat" variant="ghost" onPress={() => setSuccess(null)} />
          </View>
        </View>
      </Modal>

      <FormModal
        visible={showForm}
        title="Yeni Servis Kabul"
        onClose={() => setShowForm(false)}
        footer={<Button title="Kaydet" loading={saving} onPress={() => void createOrder()} />}
      >
        {formError ? (
          <Text style={{ color: colors.danger, fontWeight: '700' }}>{formError}</Text>
        ) : null}
        <TextField
          label="Müşteri adı"
          value={form.customer_name}
          onChangeText={t => setForm(f => ({ ...f, customer_name: t }))}
        />
        <TextField
          label="Telefon"
          keyboardType="phone-pad"
          value={form.customer_phone}
          onChangeText={t => setForm(f => ({ ...f, customer_phone: t }))}
        />
        {historyLoading || history.length > 0 ? (
          <View style={[styles.historyBox, { backgroundColor: colors.primarySoft, borderRadius: colors.radius }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
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
                <Text style={{ fontSize: 12, color: colors.text }}>
                  {h.order_no || h.id.slice(0, 8)} · {[h.device_brand, h.device_model].filter(Boolean).join(' ')} · {h.status}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <TextField
          label="Marka"
          value={form.device_brand}
          onChangeText={t => setForm(f => ({ ...f, device_brand: t }))}
        />
        <TextField
          label="Model"
          value={form.device_model}
          onChangeText={t => setForm(f => ({ ...f, device_model: t }))}
        />
        <View style={styles.imeiRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="IMEI"
              keyboardType="phone-pad"
              value={form.imei}
              onChangeText={t => setForm(f => ({ ...f, imei: t }))}
            />
          </View>
          <Pressable
            style={[styles.scanBtn, { backgroundColor: colors.primaryDark, borderRadius: colors.radius }]}
            onPress={() => setImeiScanOpen(true)}
          >
            <Text style={styles.scanBtnText}>Tara</Text>
          </Pressable>
        </View>
        <TextField
          label="Arıza / not"
          value={form.fault_description}
          onChangeText={t => setForm(f => ({ ...f, fault_description: t }))}
          multiline
        />
      </FormModal>

      <BarcodeScannerModal
        visible={imeiScanOpen}
        onClose={() => setImeiScanOpen(false)}
        onScan={(data) => setForm(f => ({ ...f, imei: data }))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  newBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    padding: 20,
    gap: 8,
    borderWidth: 1,
  },
  imeiRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  scanBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  historyBox: {
    padding: 10,
    gap: 4,
  },
})
