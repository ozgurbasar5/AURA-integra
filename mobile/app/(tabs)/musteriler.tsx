import { useMemo, useState } from 'react'
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { useAppTheme } from '@/lib/ThemeContext'
import { ModuleGuard } from '@/components/ModuleGuard'
import { useApiQuery } from '@/lib/useApiQuery'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { buildWaMeUrl } from '@/lib/wa'

type Customer = {
  id: string
  name?: string
  full_name?: string
  phone?: string
  email?: string
  segment?: string
  open_orders_count?: number
}

export default function MusterilerScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const [q, setQ] = useState('')

  const { data: items, error, loading, refreshing, refresh } = useApiQuery<Customer[]>(
    '/api/tenant/customers',
    json => {
      const j = json as { items?: Customer[]; customers?: Customer[] }
      return j.items ?? j.customers ?? []
    },
  )

  const filtered = useMemo(() => {
    const list = items ?? []
    const s = q.trim().toLowerCase()
    if (!s) return list.slice(0, 100)
    return list
      .filter(c => {
        const name = (c.name || c.full_name || '').toLowerCase()
        return name.includes(s) || (c.phone || '').includes(s) || (c.email || '').toLowerCase().includes(s)
      })
      .slice(0, 100)
  }, [items, q])

  const handleCall = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void Linking.openURL(`tel:${phone.replace(/\D/g, '')}`)
  }

  const handleWhatsApp = (phone: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const text = `Merhaba ${name}, AURA İntegra servisimizden ulaşıyoruz.`
    void Linking.openURL(buildWaMeUrl(phone, text))
  }

  const handleNewService = (phone?: string, name?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: '/kabul',
      params: { phone: phone || '', name: name || '' },
    } as never)
  }

  if (loading && !items?.length) {
    return (
      <ModuleGuard tab="musteriler">
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <LoadingBlock label="Müşteri rehberi yükleniyor…" />
        </View>
      </ModuleGuard>
    )
  }

  return (
    <ModuleGuard tab="musteriler">
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Search Header */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <SearchBar value={q} onChangeText={setQ} placeholder="Müşteri adı veya telefon ara…" />
        </View>

        {error ? <ErrorBanner message={error} onRetry={() => void refresh()} /> : null}

        {/* Customer List with 1-Tap Action Cards */}
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
          contentContainerStyle={{ padding: 14, gap: 10, flexGrow: 1, paddingBottom: 80 }}
          ListEmptyComponent={
            <EmptyState
              icon="address-book"
              title="Müşteri bulunamadı"
              subtitle={q ? 'Farklı bir isim veya numara deneyin' : 'Yeni servis kaydı oluşturarak müşteri ekleyin'}
            />
          }
          renderItem={({ item }) => {
            const name = item.name || item.full_name || 'İsimsiz Müşteri'
            const phone = item.phone
            return (
              <View
                style={[
                  styles.customerCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radiusLg,
                  },
                ]}
              >
                <View style={styles.topRow}>
                  <View style={[styles.avatarBox, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.customerPhone, { color: colors.muted }]}>
                      {phone || 'Telefon kaydı yok'}
                    </Text>
                  </View>
                  {item.segment ? (
                    <View style={[styles.segmentBadge, { backgroundColor: colors.bgElevated }]}>
                      <Text style={[styles.segmentText, { color: colors.muted }]}>{item.segment}</Text>
                    </View>
                  ) : null}
                </View>

                {/* 1-Tap Action Pills */}
                <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                  {phone ? (
                    <>
                      <Pressable
                        style={[styles.actionPill, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                        onPress={() => handleCall(phone)}
                        accessibilityLabel="Müşteriyi Ara"
                      >
                        <FontAwesome name="phone" size={13} color={colors.primary} />
                        <Text style={[styles.actionPillText, { color: colors.primary }]}>Ara</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionPill, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}
                        onPress={() => handleWhatsApp(phone, name)}
                        accessibilityLabel="WhatsApp Gönder"
                      >
                        <FontAwesome name="whatsapp" size={14} color="#10b981" />
                        <Text style={[styles.actionPillText, { color: '#10b981' }]}>WhatsApp</Text>
                      </Pressable>
                    </>
                  ) : null}

                  <Pressable
                    style={[styles.actionPill, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                    onPress={() => handleNewService(phone, name)}
                    accessibilityLabel="Bu Müşteriye Servis Aç"
                  >
                    <FontAwesome name="plus" size={12} color={colors.primary} />
                    <Text style={[styles.actionPillText, { color: colors.primary, fontWeight: '800' }]}>+ Servis Aç</Text>
                  </Pressable>
                </View>
              </View>
            )
          }}
        />

        <FloatingActionButton
          icon="plus"
          label="Yeni Kabul"
          onPress={() => handleNewService()}
          accessibilityLabel="Yeni Servis Kabulü"
        />
      </View>
    </ModuleGuard>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  customerCard: { padding: 14, borderWidth: 1, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '900' },
  customerName: { fontSize: 15, fontWeight: '800' },
  customerPhone: { fontSize: 13, marginTop: 2 },
  segmentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  segmentText: { fontSize: 11, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
  },
  actionPillText: { fontSize: 12, fontWeight: '700' },
})
