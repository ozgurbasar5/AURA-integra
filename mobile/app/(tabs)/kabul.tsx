import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { apiFetch, apiUpload } from '@/lib/api'
import { enqueueJob, listQueuedJobs } from '@/lib/offline-queue'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FormModal } from '@/components/ui/FormModal'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { ServiceCardItem } from '@/components/service/ServiceCardItem'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { printLabel } from '@/lib/label-print'
import { printToThermalPrinter } from '@/lib/thermal-printer'

type Order = {
  id: string
  order_no: string | null
  customer_name: string | null
  customer_phone?: string | null
  device_brand: string | null
  device_model: string | null
  status: string | null
  fault_description?: string | null
  created_at: string | null
  updated_at?: string | null
}

const COMMON_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Oppo', 'Diğer']

const COMMON_MODELS: Record<string, string[]> = {
  Apple: ['iPhone 15', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPad'],
  Samsung: ['Galaxy S24', 'Galaxy S23', 'Galaxy A54', 'Galaxy A34', 'Galaxy A14'],
  Xiaomi: ['Redmi Note 13', 'Redmi Note 12', 'Redmi 12', 'POCO X6'],
}

const empty = {
  customer_name: '',
  customer_phone: '',
  device_brand: 'Apple',
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

  // Phone auto-lookup: automatically fills name & pulls customer job history
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
        const json = (await apiFetch(`/api/service-orders?search=${q}&limit=6`)) as { data?: Order[] }
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
    }, 300)
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current)
    }
  }, [form.customer_phone, showForm])

  const load = useCallback(
    async (isRefresh = false) => {
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
          const json = (await apiFetch('/api/service-orders?limit=40')) as { data?: Order[] }
          setItems(json.data ?? [])
        } catch {
          const { data, error: qErr } = await supabase
            .from('service_orders')
            .select('id, order_no, customer_name, customer_phone, device_brand, device_model, status, fault_description, created_at, updated_at')
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
    },
    [profile, profile?.tenant_id],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  async function createOrder() {
    if (!form.customer_phone.trim()) {
      setFormError('Müşteri telefon numarası zorunludur')
      return
    }
    if (!form.device_brand.trim()) {
      setFormError('Cihaz markası seçin veya girin')
      return
    }
    setSaving(true)
    setFormError('')
    const payload = {
      customer_name: form.customer_name.trim() || `Müşteri (${form.customer_phone.slice(-4)})`,
      customer_phone: form.customer_phone.trim(),
      device_brand: form.device_brand.trim(),
      device_model: form.device_model.trim() || 'Standart',
      imei: form.imei.trim() || undefined,
      fault_description: form.fault_description.trim() || 'Servis Kabul',
      status: 'alindi',
    }
    try {
      const created = (await apiFetch('/api/service-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      })) as { data?: { id?: string; order_no?: string; tracking_code?: string } }
      const id = String(created.data?.id || '')
      const orderNo = String(created.data?.order_no || '')
      const tracking = created.data?.tracking_code ? String(created.data.tracking_code) : orderNo
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
        Alert.alert('Çevrimdışı Kuyruk', 'İnternet bağlantısı yok — servis kaydı kuyruğa alındı.')
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setFormError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  async function uploadSuccessPhoto(source: 'camera' | 'library') {
    if (!success?.id) return
    setPhotoBusy(true)
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false, mediaTypes: ['images'] })

      if (result.canceled || !result.assets?.length) return

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      for (const asset of result.assets) {
        const formData = new FormData()
        formData.append('file', {
          uri: asset.uri,
          name: `kabul-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as unknown as Blob)
        await apiUpload(`/api/service-orders/${success.id}/photos`, formData)
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Tamam', 'Fotoğraf kaydedildi')
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (loading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="Kabul listesi…" />
      </View>
    )
  }

  const modelSuggestions = form.device_brand ? COMMON_MODELS[form.device_brand] || [] : []

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.topTitle, { color: colors.text }]}>Servis Kabul</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Son {items.length} kayıt{queued > 0 ? ` · ${queued} çevrimdışı kuyrukta` : ''}
          </Text>
        </View>
        <Pressable
          style={[styles.quickNewBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setFormError('')
            setShowForm(true)
          }}
        >
          <FontAwesome name="plus" size={13} color="#fff" />
          <Text style={styles.quickNewBtnText}>Yeni Kabul</Text>
        </Pressable>
      </View>

      {error ? <ErrorBanner message={error} onRetry={() => void load(true)} /> : null}

      {/* Orders List */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 96, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard"
            title="Henüz kabul yok"
            subtitle="Hızlıca yeni servis kaydı oluşturun"
            actionLabel="+ Yeni Kabul"
            onAction={() => {
              setFormError('')
              setShowForm(true)
            }}
          />
        }
        renderItem={({ item }) => (
          <ServiceCardItem
            item={item}
            onPress={() => router.push(`/atolye/${item.id}`)}
          />
        )}
      />

      {/* FAB Quick New Service Button */}
      <FloatingActionButton
        icon="plus"
        label="Yeni Kabul"
        onPress={() => {
          setFormError('')
          setShowForm(true)
        }}
        accessibilityLabel="Yeni Servis Kabulü Oluştur"
      />

      {/* Success Modal */}
      <Modal visible={!!success} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
            <View style={[styles.successIconBox, { backgroundColor: colors.successSoft }]}>
              <FontAwesome name="check" size={28} color={colors.success} />
            </View>
            <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>Kabul Başarıyla Alındı</Text>
            <Text style={{ fontWeight: '900', fontSize: 24, color: colors.primary }}>{success?.order_no}</Text>
            {success?.tracking ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>Takip Kodu: {success.tracking}</Text>
            ) : null}

            {success?.id ? (
              <View style={{ gap: 8, width: '100%', marginTop: 8 }}>
                <Button
                  title="📷 Fotoğraf Çek & Ekle"
                  variant="secondary"
                  loading={photoBusy}
                  onPress={() => void uploadSuccessPhoto('camera')}
                />
                <Button
                  title="🏷️ Barkod Etiketi Bas"
                  variant="secondary"
                  onPress={() => {
                    if (!success) return
                    void printLabel({
                      title: success.order_no,
                      orderNo: success.order_no,
                      subtitle: 'Servis Kabul',
                    })
                  }}
                />
                <Button
                  title="🧾 Termal Fiş Yazdır"
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
                      tenantName: profile?.full_name || 'AURA Servis',
                      tenantPhone: '0850 000 0000',
                    })
                    Alert.alert('Termal Yazıcı', res.message)
                  }}
                />
                <Button
                  title="Atölye Detayına Git"
                  onPress={() => {
                    const id = success?.id
                    setSuccess(null)
                    if (id) router.push(`/atolye/${id}`)
                  }}
                />
              </View>
            ) : null}
            <Button title="Kapat" variant="ghost" onPress={() => setSuccess(null)} />
          </View>
        </View>
      </Modal>

      {/* 3-Click Intake Form Modal */}
      <FormModal
        visible={showForm}
        title="Yeni Servis Kabulü"
        onClose={() => setShowForm(false)}
        footer={
          <Button
            title="Kabulü Kaydet"
            loading={saving}
            onPress={() => void createOrder()}
            style={{ minHeight: 52 }}
          />
        }
      >
        {formError ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{formError}</Text> : null}

        {/* Step 1: Customer Phone with instant auto-fill */}
        <TextField
          label="Müşteri Telefonu *"
          keyboardType="phone-pad"
          value={form.customer_phone}
          onChangeText={t => setForm(f => ({ ...f, customer_phone: t }))}
          placeholder="05xx xxx xx xx"
          autoFocus
        />

        <TextField
          label="Müşteri Adı / Soyadı"
          value={form.customer_name}
          onChangeText={t => setForm(f => ({ ...f, customer_name: t }))}
          placeholder="Müşteri adı (opsiyonel)"
        />

        {/* Step 2: Customer Job History Banner */}
        {historyLoading || history.length > 0 ? (
          <View style={[styles.historyBox, { backgroundColor: colors.primarySoft, borderRadius: colors.radius }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
              {historyLoading ? 'Müşteri geçmişi taranıyor…' : `Mevcut Müşteri · Önceki ${history.length} Servis Kaydı`}
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
                  • {h.order_no || h.id.slice(0, 8)}: {[h.device_brand, h.device_model].filter(Boolean).join(' ')} ({h.status})
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Step 3: Quick Brand Chips */}
        <Text style={[styles.fieldLabel, { color: colors.muted }]}>CİHAZ MARKASI *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {COMMON_BRANDS.map(b => (
              <Chip
                key={b}
                label={b}
                active={form.device_brand === b}
                onPress={() => setForm(f => ({ ...f, device_brand: b, device_model: '' }))}
              />
            ))}
          </View>
        </ScrollView>

        {/* Step 4: Model with Quick Chips & Text Field */}
        {modelSuggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {modelSuggestions.map(m => (
                <Chip
                  key={m}
                  label={m}
                  active={form.device_model === m}
                  onPress={() => setForm(f => ({ ...f, device_model: m }))}
                />
              ))}
            </View>
          </ScrollView>
        )}

        <TextField
          label="Model"
          value={form.device_model}
          onChangeText={t => setForm(f => ({ ...f, device_model: t }))}
          placeholder="Model adı veya kodu"
        />

        {/* Step 5: IMEI with 1-Tap Barcode Camera Scan */}
        <View style={styles.imeiRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="IMEI / Seri No"
              keyboardType="phone-pad"
              value={form.imei}
              onChangeText={t => setForm(f => ({ ...f, imei: t }))}
              placeholder="15 haneli IMEI veya seri no"
            />
          </View>
          <Pressable
            style={[styles.scanBtn, { backgroundColor: colors.primaryDark, borderRadius: colors.radius }]}
            onPress={() => setImeiScanOpen(true)}
            accessibilityLabel="Barkod Okut"
          >
            <FontAwesome name="barcode" size={18} color="#fff" />
            <Text style={styles.scanBtnText}>Tara</Text>
          </Pressable>
        </View>

        <TextField
          label="Arıza / Şikayet Açıklaması"
          value={form.fault_description}
          onChangeText={t => setForm(f => ({ ...f, fault_description: t }))}
          placeholder="Örn: Ekran kırık, batarya şişmiş, şarj olmuyor…"
          multiline
        />
      </FormModal>

      <BarcodeScannerModal
        visible={imeiScanOpen}
        onClose={() => setImeiScanOpen(false)}
        onScan={data => setForm(f => ({ ...f, imei: data }))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: { fontSize: 18, fontWeight: '900' },
  quickNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    minHeight: 44,
  },
  quickNewBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 4, marginBottom: 6 },
  imeiRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
  },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  historyBox: { padding: 10, gap: 4, marginVertical: 4 },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
})
