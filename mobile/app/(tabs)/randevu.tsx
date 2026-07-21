import { useCallback, useRef, useState } from 'react'
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { enqueueJob } from '@/lib/offline-queue'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { Button } from '@/components/ui/Button'
import { FormModal } from '@/components/ui/FormModal'
import { ListRow } from '@/components/ui/ListRow'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

type Appt = {
  id: string
  customer_name: string
  customer_phone?: string
  appointment_date: string
  appointment_time?: string
  device_brand?: string
  device_model?: string
  status?: string
  fault_description?: string
}

export default function RandevuScreen() {
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const hasData = useRef(false)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    appointment_date: today,
    appointment_time: '10:00',
    device_brand: '',
    device_model: '',
    fault_description: '',
  })

  const load = useCallback(async (fresh = false, isRefresh = false) => {
    if (!hasData.current && !isRefresh) setLoading(true)
    if (isRefresh) setRefreshing(true)
    try {
      const json = await apiFetch('/api/tenant/appointments', { fresh }) as { items?: Appt[] }
      setItems(json.items ?? [])
      hasData.current = true
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Randevular yüklenemedi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    void (async () => {
      if (!hasData.current) await load(false)
      else await load(true)
    })()
  }, [load]))

  async function create() {
    if (!form.customer_name.trim() || !form.appointment_date) {
      setError('Müşteri ve tarih gerekli')
      return
    }
    setBusy(true)
    setError('')
    const payload = { ...form }
    try {
      await apiFetch('/api/tenant/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      invalidateApiCache('/api/tenant/appointments')
      setShowForm(false)
      await load(true, true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kaydedilemedi'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu|zaman aşımı/i.test(msg)) {
        await enqueueJob({
          path: '/api/tenant/appointments',
          method: 'POST',
          body: payload,
          label: `Randevu ${payload.customer_name}`,
        })
        setShowForm(false)
        Alert.alert('Çevrimdışı kaydedildi', 'Bağlantı yok — randevu kuyruğa alındı. Ana ekrandan gönderebilirsiniz.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading && !items.length) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Randevular…" /></View>
  }

  return (
    <ModuleGuard tab="randevu">
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ padding: 16 }}>
        <Button title="Yeni randevu" onPress={() => setShowForm(true)} />
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => void load(true, true)} /> : null}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true, true)} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="calendar" title="Randevu yok" actionLabel="Yeni randevu" onAction={() => setShowForm(true)} />}
        renderItem={({ item }) => (
          <ListRow
            title={item.customer_name}
            subtitle={[item.device_brand, item.device_model].filter(Boolean).join(' ') || item.fault_description}
            meta={`${item.appointment_date} ${item.appointment_time || ''} · ${item.status || ''}`}
          />
        )}
      />

      <FormModal
        visible={showForm}
        title="Yeni randevu"
        onClose={() => setShowForm(false)}
        footer={<Button title="Kaydet" loading={busy} onPress={() => void create()} />}
      >
        <TextField label="Müşteri" value={form.customer_name} onChangeText={t => setForm(f => ({ ...f, customer_name: t }))} />
        <TextField label="Telefon" keyboardType="phone-pad" value={form.customer_phone} onChangeText={t => setForm(f => ({ ...f, customer_phone: t }))} />
        <TextField label="Tarih (YYYY-MM-DD)" value={form.appointment_date} onChangeText={t => setForm(f => ({ ...f, appointment_date: t }))} />
        <TextField label="Saat" value={form.appointment_time} onChangeText={t => setForm(f => ({ ...f, appointment_time: t }))} />
        <TextField label="Marka" value={form.device_brand} onChangeText={t => setForm(f => ({ ...f, device_brand: t }))} />
        <TextField label="Model" value={form.device_model} onChangeText={t => setForm(f => ({ ...f, device_model: t }))} />
        <TextField label="Arıza" value={form.fault_description} onChangeText={t => setForm(f => ({ ...f, fault_description: t }))} />
      </FormModal>
    </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
