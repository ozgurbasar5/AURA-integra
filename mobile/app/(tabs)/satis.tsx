import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { enqueueJob } from '@/lib/offline-queue'
import { showToast } from '@/lib/toast'
import { usePartsCatalog } from '@/lib/PartsCatalog'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { useAppTheme } from '@/lib/ThemeContext'
import { Chip } from '@/components/ui/Chip'
import { SearchBar } from '@/components/ui/SearchBar'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'

const PAYMENTS = [
  { id: 'nakit', label: 'Nakit' },
  { id: 'kredi_karti', label: 'Kart' },
  { id: 'havale', label: 'Havale' },
]

const CART_KEY = 'aura_mobile_cart_draft'

export default function SatisScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = 72 + insets.bottom
  const catalog = usePartsCatalog()
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [cart, setCart] = useState<{ id: string; name: string; qty: number; unit_price: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [payment, setPayment] = useState('nakit')
  const [customer, setCustomer] = useState('')
  const [stockWarning, setStockWarning] = useState('')

  useFocusEffect(useCallback(() => {
    if (profile?.tenant_id) void catalog.ensureLoaded()
  }, [profile?.tenant_id, catalog]))

  useEffect(() => {
    void AsyncStorage.getItem(CART_KEY).then(raw => {
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as typeof cart
        if (Array.isArray(parsed) && parsed.length) setCart(parsed)
      } catch { /* ignore */ }
    })
  }, [])

  useEffect(() => {
    void AsyncStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (catalog.error) setError(catalog.error)
  }, [catalog.error])

  const priceOf = (p: { sale_price?: number; sell_price?: number }) =>
    Number(p.sale_price ?? p.sell_price) || 0

  const filtered = catalog.filter(q, { inStockOnly: true, limit: 40 })

  function cartQtyFor(id: string) {
    return cart.find(i => i.id === id)?.qty ?? 0
  }

  function warnStock(part: { name: string; stock_qty: number }, nextQty: number) {
    if (nextQty <= part.stock_qty) {
      setStockWarning('')
      return false
    }
    const msg = `${part.name}: stok yetersiz (max ${part.stock_qty})`
    setStockWarning(msg)
    Alert.alert('Stok uyarısı', `${part.name} için stok yetersiz. Mevcut: ${part.stock_qty}`)
    return true
  }

  function addToCart(p: { id: string; name: string; stock_qty: number; sale_price?: number; sell_price?: number }) {
    const nextQty = cartQtyFor(p.id) + 1
    if (warnStock(p, nextQty)) return
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: p.id, name: p.name, qty: 1, unit_price: priceOf(p) }]
    })
  }

  function bumpCart(id: string, delta: number) {
    const part = catalog.parts.find(p => p.id === id)
    if (!part) return
    const nextQty = cartQtyFor(id) + delta
    if (delta > 0 && warnStock(part, nextQty)) return
    setStockWarning('')
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0))
  }

  async function completeSale(overridePayment?: string) {
    if (!cart.length) return
    const payMethod = overridePayment ?? payment
    if (overridePayment) setPayment(overridePayment)
    setBusy(true)
    setError('')
    try {
      await catalog.refresh()
      for (const c of cart) {
        const p = catalog.parts.find(x => x.id === c.id)
        if (!p || p.stock_qty < c.qty) {
          setError(`${c.name}: stok yetersiz (max ${p?.stock_qty ?? 0})`)
          return
        }
      }
      await apiFetch('/api/tenant/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(c => ({
            stock_id: c.id,
            name: c.name,
            qty: c.qty,
            unit_price: c.unit_price,
          })),
          customer_name: customer.trim() || 'Mobil POS',
          payment_method: payMethod,
          vat_rate: 20,
        }),
      })
      setCart([])
      setCustomer('')
      void AsyncStorage.removeItem(CART_KEY)
      catalog.invalidate()
      await catalog.refresh()
      invalidateApiCache('/api/tenant/parts')
      showToast('Satış tamamlandı', 'success')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Satış başarısız'
      if (/ulaşılamıyor|Network|Failed to fetch|Sunucu/i.test(message)) {
        const body = {
          items: cart.map(c => ({
            stock_id: c.id,
            name: c.name,
            qty: c.qty,
            unit_price: c.unit_price,
          })),
          customer_name: customer.trim() || 'Mobil POS',
          payment_method: payMethod,
          vat_rate: 20,
        }
        await enqueueJob({
          path: '/api/tenant/sales',
          method: 'POST',
          body,
          label: 'POS satış',
        })
        setCart([])
        setCustomer('')
        void AsyncStorage.removeItem(CART_KEY)
        showToast('Satış kuyruğa alındı — bağlantı gelince gönderilir', 'info')
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  const total = cart.reduce((s, i) => s + i.qty * i.unit_price, 0)

  if (catalog.loading && catalog.parts.length === 0) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]}><LoadingBlock label="Stok yükleniyor…" /></View>
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <SearchBar placeholder="Ürün / barkod ara" value={q} onChangeText={setQ} />
        </View>
        <Pressable style={[styles.scanBtn, { backgroundColor: colors.primaryDark }]} onPress={() => setScanOpen(true)}>
          <Text style={styles.scanBtnText}>Tara</Text>
        </Pressable>
      </View>
      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          setQ(data)
          const hit = catalog.findByBarcode(data)
          if (hit) addToCart(hit)
        }}
      />
      {error ? <ErrorBanner message={error} onRetry={() => void catalog.refresh()} /> : null}
      {stockWarning ? <Text style={{ color: colors.warning, paddingHorizontal: 16, marginTop: 4, fontWeight: '700', fontSize: 12 }}>{stockWarning}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={catalog.refreshing} onRefresh={() => void catalog.refresh()} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: bottomPad + (cart.length ? 200 : 24), flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="shopping-cart"
            title={q ? 'Sonuç yok' : 'Satılabilir stok yok'}
            subtitle={q ? 'Başka barkod / isim deneyin' : 'Stok girişi veya alış yapın'}
          />
        }
        ListHeaderComponent={cart.length > 0 ? (
          <View style={[styles.cartBox, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={[styles.cartTitle, { color: colors.text }]}>Sepet · {cart.reduce((s, c) => s + c.qty, 0)} kalem</Text>
            {cart.map(c => (
              <View key={c.id} style={styles.cartRow}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
                <Pressable style={[styles.cartBump, { backgroundColor: colors.border }]} onPress={() => bumpCart(c.id, -1)}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>−</Text>
                </Pressable>
                <Text style={{ fontWeight: '800', minWidth: 20, textAlign: 'center', color: colors.text }}>{c.qty}</Text>
                <Pressable style={[styles.cartBump, { backgroundColor: colors.primarySoft }]} onPress={() => bumpCart(c.id, 1)}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary }}>+</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radiusLg,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={() => addToCart(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{item.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Stok: {item.stock_qty} · {item.barcode || '—'}</Text>
            </View>
            <Text style={{ fontWeight: '800', color: colors.primary }}>{priceOf(item).toFixed(0)} ₺</Text>
          </Pressable>
        )}
      />

      {cart.length > 0 && (
        <View style={[styles.checkout, { backgroundColor: colors.primaryDark, bottom: bottomPad }]}>
          <TextField
            placeholder="Müşteri (ops.)"
            value={customer}
            onChangeText={setCustomer}
            style={styles.custInput}
          />
          <View style={styles.payRow}>
            {PAYMENTS.map(p => (
              <Chip
                key={p.id}
                label={p.label}
                active={payment === p.id}
                onPress={() => setPayment(p.id)}
              />
            ))}
          </View>
          <View style={styles.checkoutRow}>
            <View>
              <Text style={styles.checkoutMeta}>{cart.reduce((s, i) => s + i.qty, 0)} ürün · {payment}</Text>
              <Text style={styles.checkoutTotal}>{total.toFixed(2)} ₺</Text>
            </View>
            <Pressable style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={() => void completeSale()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Tamamla</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: 16, paddingBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  scanBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  cartBox: { borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 8, gap: 6 },
  cartTitle: { fontWeight: '800', marginBottom: 4 },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBump: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  checkout: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 16, padding: 12, gap: 8 },
  custInput: { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: '#fff' },
  payRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  checkoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkoutMeta: { color: '#94a3b8', fontSize: 11 },
  checkoutTotal: { color: '#fff', fontWeight: '900', fontSize: 18 },
  checkoutBtn: { borderRadius: 12, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: '800' },
})
