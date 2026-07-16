import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { AuraColors } from '@/constants/AuraColors'

type Part = {
  id: string
  name: string
  barcode: string | null
  stock_qty: number
  sale_price?: number
  sell_price?: number
}

const PAYMENTS = [
  { id: 'nakit', label: 'Nakit' },
  { id: 'kredi_karti', label: 'Kart' },
  { id: 'havale', label: 'Havale' },
]

export default function SatisScreen() {
  const { profile } = useAuth()
  const [parts, setParts] = useState<Part[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState<{ id: string; name: string; qty: number; unit_price: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [payment, setPayment] = useState('nakit')
  const [customer, setCustomer] = useState('')
  const [stockWarning, setStockWarning] = useState('')

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return
    setLoading(true)
    setError('')
    try {
      const json = await apiFetch('/api/tenant/parts') as { items?: Part[] }
      setParts(json.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stok yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const priceOf = (p: Part) => Number(p.sale_price ?? p.sell_price) || 0

  const filtered = parts.filter(p => {
    if (p.stock_qty <= 0) return false
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return p.name.toLowerCase().includes(s) || (p.barcode || '').includes(q.trim())
  }).slice(0, 40)

  function cartQtyFor(id: string) {
    return cart.find(i => i.id === id)?.qty ?? 0
  }

  function warnStock(part: Part, nextQty: number) {
    if (nextQty <= part.stock_qty) {
      setStockWarning('')
      return false
    }
    const msg = `${part.name}: stok yetersiz (max ${part.stock_qty})`
    setStockWarning(msg)
    Alert.alert('Stok uyarısı', `${part.name} için stok yetersiz. Mevcut: ${part.stock_qty}`)
    return true
  }

  function addToCart(p: Part) {
    const nextQty = cartQtyFor(p.id) + 1
    if (warnStock(p, nextQty)) return
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: p.id, name: p.name, qty: 1, unit_price: priceOf(p) }]
    })
  }

  function bumpCart(id: string, delta: number) {
    const part = parts.find(p => p.id === id)
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
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Satış başarısız')
    } finally {
      setBusy(false)
    }
  }

  const total = cart.reduce((s, i) => s + i.qty * i.unit_price, 0)

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.search, { flex: 1 }]}
          placeholder="Ürün / barkod ara"
          placeholderTextColor={AuraColors.muted}
          value={q}
          onChangeText={setQ}
        />
        <Pressable style={styles.scanBtn} onPress={() => setScanOpen(true)}>
          <Text style={styles.scanBtnText}>Tara</Text>
        </Pressable>
      </View>
      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          setQ(data)
          const hit = parts.find(p => (p.barcode || '') === data)
          if (hit) addToCart(hit)
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {stockWarning ? <Text style={styles.stockWarn}>{stockWarning}</Text> : null}
      {loading && parts.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={AuraColors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 220 }}
          ListHeaderComponent={cart.length > 0 ? (
            <View style={styles.cartBox}>
              <Text style={styles.cartTitle}>Sepet</Text>
              {cart.map(c => (
                <View key={c.id} style={styles.cartRow}>
                  <Text style={styles.cartName} numberOfLines={1}>{c.name}</Text>
                  <Pressable style={styles.cartBump} onPress={() => bumpCart(c.id, -1)}>
                    <Text style={styles.cartBumpText}>−</Text>
                  </Pressable>
                  <Text style={styles.cartQty}>{c.qty}</Text>
                  <Pressable style={styles.cartBump} onPress={() => bumpCart(c.id, 1)}>
                    <Text style={styles.cartBumpText}>+</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => addToCart(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.meta}>Stok: {item.stock_qty} · {item.barcode || '—'}</Text>
              </View>
              <Text style={styles.price}>{priceOf(item).toFixed(0)} ₺</Text>
            </Pressable>
          )}
        />
      )}

      {cart.length > 0 && (
        <View style={styles.checkout}>
          <TextInput
            style={styles.custInput}
            placeholder="Müşteri (ops.)"
            placeholderTextColor="#94a3b8"
            value={customer}
            onChangeText={setCustomer}
          />
          <View style={styles.payRow}>
            {PAYMENTS.map(p => (
              <Pressable
                key={p.id}
                style={[styles.payChip, payment === p.id && styles.payActive]}
                onPress={() => setPayment(p.id)}
              >
                <Text style={[styles.payText, payment === p.id && styles.payTextActive]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.quickPayRow}>
            <Pressable
              style={[styles.quickPayBtn, busy && styles.quickPayDisabled]}
              onPress={() => void completeSale('nakit')}
              disabled={busy}
            >
              <Text style={styles.quickPayText}>Nakit · {total.toFixed(0)} ₺</Text>
            </Pressable>
            <Pressable
              style={[styles.quickPayBtn, busy && styles.quickPayDisabled]}
              onPress={() => void completeSale('kredi_karti')}
              disabled={busy}
            >
              <Text style={styles.quickPayText}>Kart · {total.toFixed(0)} ₺</Text>
            </Pressable>
          </View>
          <View style={styles.checkoutRow}>
            <View>
              <Text style={styles.checkoutMeta}>{cart.reduce((s, i) => s + i.qty, 0)} ürün · {payment}</Text>
              <Text style={styles.checkoutTotal}>{total.toFixed(2)} ₺</Text>
            </View>
            <Pressable style={styles.checkoutBtn} onPress={() => void completeSale()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Tamamla</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuraColors.bg },
  searchWrap: { padding: 16, paddingBottom: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: {
    backgroundColor: AuraColors.card,
    borderWidth: 1,
    borderColor: AuraColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  scanBtn: {
    backgroundColor: AuraColors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanBtnText: { color: '#fff', fontWeight: '800' },
  error: { color: AuraColors.danger, paddingHorizontal: 16, marginTop: 8 },
  stockWarn: { color: AuraColors.warning, paddingHorizontal: 16, marginTop: 4, fontWeight: '700', fontSize: 12 },
  cartBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: AuraColors.border,
    marginBottom: 8,
    gap: 6,
  },
  cartTitle: { fontWeight: '800', color: AuraColors.text, marginBottom: 4 },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartName: { flex: 1, color: AuraColors.text, fontWeight: '600' },
  cartBump: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  cartBumpText: { fontWeight: '800', fontSize: 16 },
  cartQty: { fontWeight: '800', minWidth: 20, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuraColors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 10,
  },
  title: { fontWeight: '700', color: AuraColors.text },
  meta: { color: AuraColors.muted, fontSize: 12, marginTop: 2 },
  price: { fontWeight: '800', color: AuraColors.primary },
  checkout: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: AuraColors.primaryDark,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  custInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
  },
  payRow: { flexDirection: 'row', gap: 6 },
  payChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#334155',
  },
  payActive: { backgroundColor: AuraColors.primary },
  payText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  payTextActive: { color: '#fff' },
  quickPayRow: { flexDirection: 'row', gap: 6 },
  quickPayBtn: {
    flex: 1,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickPayDisabled: { opacity: 0.6 },
  quickPayText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  checkoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkoutMeta: { color: '#94a3b8', fontSize: 11 },
  checkoutTotal: { color: '#fff', fontWeight: '900', fontSize: 18 },
  checkoutBtn: {
    backgroundColor: AuraColors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    minHeight: 44,
    justifyContent: 'center',
  },
  checkoutBtnText: { color: '#fff', fontWeight: '800' },
})
