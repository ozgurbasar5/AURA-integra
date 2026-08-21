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
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { useAuth } from '@/lib/auth'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { enqueueJob } from '@/lib/offline-queue'
import { showToast } from '@/lib/toast'
import { usePartsCatalog, type CatalogPart } from '@/lib/PartsCatalog'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { useAppTheme } from '@/lib/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { SearchBar } from '@/components/ui/SearchBar'
import { TextField } from '@/components/ui/TextField'
import { EmptyState, ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { FormModal } from '@/components/ui/FormModal'

const PAYMENTS = [
  { id: 'nakit', label: 'Nakit', icon: 'money' },
  { id: 'kredi_karti', label: 'Kart / POS', icon: 'credit-card' },
  { id: 'havale', label: 'Havale', icon: 'bank' },
]

const CART_KEY = 'aura_mobile_cart_draft_v2'

export default function SatisScreen() {
  const { profile } = useAuth()
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 12) + 72

  const catalog = usePartsCatalog()
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [cart, setCart] = useState<{ id: string; name: string; qty: number; unit_price: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [payment, setPayment] = useState('nakit')
  const [customer, setCustomer] = useState('')

  useFocusEffect(
    useCallback(() => {
      if (profile?.tenant_id) void catalog.ensureLoaded()
    }, [profile?.tenant_id, catalog]),
  )

  useEffect(() => {
    void AsyncStorage.getItem(CART_KEY).then(raw => {
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as typeof cart
        if (Array.isArray(parsed) && parsed.length) setCart(parsed)
      } catch {
        /* ignore */
      }
    })
  }, [])

  useEffect(() => {
    void AsyncStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (catalog.error) setError(catalog.error)
  }, [catalog.error])

  const priceOf = (p: { sale_price?: number; sell_price?: number; buy_price?: number }) =>
    Number(p.sale_price ?? p.sell_price ?? p.buy_price) || 0

  const filtered = catalog.filter(q, { inStockOnly: true, limit: 50 })

  function cartQtyFor(id: string) {
    return cart.find(i => i.id === id)?.qty ?? 0
  }

  function addToCart(p: CatalogPart) {
    const currentInCart = cartQtyFor(p.id)
    if (currentInCart + 1 > p.stock_qty) {
      Alert.alert('Stok Yetersiz', `${p.name} için kalan stok: ${p.stock_qty}`)
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
      return [...prev, { id: p.id, name: p.name, qty: 1, unit_price: priceOf(p) }]
    })
  }

  function bumpCart(id: string, delta: number) {
    const part = catalog.parts.find(p => p.id === id)
    if (!part) return
    const currentInCart = cartQtyFor(id)
    if (delta > 0 && currentInCart + delta > part.stock_qty) {
      Alert.alert('Stok Yetersiz', `${part.name} için kalan stok: ${part.stock_qty}`)
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCart(prev =>
      prev
        .map(i => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter(i => i.qty > 0),
    )
  }

  async function completeSale() {
    if (!cart.length) return
    setBusy(true)
    setError('')
    try {
      await catalog.refresh()
      for (const c of cart) {
        const p = catalog.parts.find(x => x.id === c.id)
        if (!p || p.stock_qty < c.qty) {
          setError(`${c.name}: yetersiz stok (mevcut: ${p?.stock_qty ?? 0})`)
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
          customer_name: customer.trim() || 'Hızlı POS Satış',
          payment_method: payment,
          vat_rate: 20,
        }),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setCart([])
      setCustomer('')
      setCheckoutModalOpen(false)
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
          customer_name: customer.trim() || 'Hızlı POS Satış',
          payment_method: payment,
          vat_rate: 20,
        }
        await enqueueJob({
          path: '/api/tenant/sales',
          method: 'POST',
          body,
          label: 'POS Satış',
        })
        setCart([])
        setCustomer('')
        setCheckoutModalOpen(false)
        void AsyncStorage.removeItem(CART_KEY)
        showToast('Satış kuyruğa alındı — internet gelince iletilecek', 'info')
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  const total = cart.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const cartItemCount = cart.reduce((s, i) => s + i.qty, 0)

  if (catalog.loading && catalog.parts.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="POS ürün kataloğu yükleniyor…" />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Top Search & Barcode Scan Bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <SearchBar placeholder="Ürün adı veya barkod ara…" value={q} onChangeText={setQ} />
        </View>
        <Pressable
          style={[styles.scanBtn, { backgroundColor: colors.primaryDark }]}
          onPress={() => setScanOpen(true)}
          accessibilityLabel="Barkod Tara"
        >
          <FontAwesome name="barcode" size={18} color="#fff" />
        </Pressable>
      </View>

      {error ? <ErrorBanner message={error} onRetry={() => void catalog.refresh()} /> : null}

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={catalog.refreshing} onRefresh={() => void catalog.refresh()} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: cartItemCount > 0 ? bottomPad + 70 : bottomPad }}
        ListEmptyComponent={
          <EmptyState
            icon="shopping-cart"
            title={q ? 'Ürün Bulunamadı' : 'Satılabilir Stok Yok'}
            subtitle={q ? 'Farklı bir arama yapın veya barkod okutun' : 'Stok modülünden ürün girişi yapın'}
          />
        }
        renderItem={({ item }) => {
          const inCart = cartQtyFor(item.id)
          const price = priceOf(item)
          return (
            <Pressable
              style={({ pressed }) => [
                styles.productCard,
                {
                  backgroundColor: colors.card,
                  borderColor: inCart > 0 ? colors.primary : colors.border,
                  borderRadius: colors.radiusLg,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={() => addToCart(item)}
            >
              <View style={[styles.productIcon, { backgroundColor: inCart > 0 ? colors.primarySoft : colors.bgElevated }]}>
                <FontAwesome name="cube" size={18} color={inCart > 0 ? colors.primary : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.productMeta, { color: colors.muted }]}>
                  Stok: {item.stock_qty} · {item.barcode || 'Barkodsuz'}
                </Text>
              </View>
              <View style={styles.productPriceCol}>
                <Text style={[styles.productPriceText, { color: colors.primary }]}>
                  {price.toFixed(0)} ₺
                </Text>
                {inCart > 0 ? (
                  <View style={[styles.inCartBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.inCartBadgeText}>{inCart} Sepette</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )
        }}
      />

      {/* Floating Bottom Cart Summary Banner */}
      {cartItemCount > 0 && (
        <View
          style={[
            styles.floatingCartBar,
            {
              backgroundColor: colors.primaryDark,
              bottom: bottomPad,
              borderRadius: colors.radiusLg,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cartBarCountText}>{cartItemCount} Kalem Ürün</Text>
            <Text style={styles.cartBarTotalText}>{total.toLocaleString('tr-TR')} ₺</Text>
          </View>
          <Pressable
            style={[styles.checkoutTriggerBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCheckoutModalOpen(true)}
          >
            <FontAwesome name="credit-card" size={16} color="#fff" />
            <Text style={styles.checkoutTriggerText}>Ödeme Al</Text>
          </Pressable>
        </View>
      )}

      {/* Checkout Modal Sheet */}
      <FormModal
        visible={checkoutModalOpen}
        title="Sepet & Tahsilat"
        onClose={() => setCheckoutModalOpen(false)}
        footer={
          <Button
            title={`Satışı Tamamla (${total.toLocaleString('tr-TR')} ₺)`}
            loading={busy}
            onPress={() => void completeSale()}
            style={{ backgroundColor: colors.success, minHeight: 52 }}
          />
        }
      >
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>SEPETTEKİ ÜRÜNLER</Text>
        {cart.map(c => (
          <View key={c.id} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cartItemName, { color: colors.text }]} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Birim: {c.unit_price.toFixed(0)} ₺
              </Text>
            </View>
            <View style={styles.qtyControlRow}>
              <Pressable
                style={[styles.qtyBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                onPress={() => bumpCart(c.id, -1)}
              >
                <FontAwesome name="minus" size={12} color={colors.text} />
              </Pressable>
              <Text style={[styles.qtyValueText, { color: colors.text }]}>{c.qty}</Text>
              <Pressable
                style={[styles.qtyBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                onPress={() => bumpCart(c.id, 1)}
              >
                <FontAwesome name="plus" size={12} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        ))}

        <TextField
          label="Müşteri Adı (Opsiyonel)"
          placeholder="Müşteri adı veya firma…"
          value={customer}
          onChangeText={setCustomer}
        />

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ÖDEME TÜRÜ</Text>
        <View style={styles.paymentChipsRow}>
          {PAYMENTS.map(p => (
            <Chip
              key={p.id}
              label={p.label}
              active={payment === p.id}
              onPress={() => setPayment(p.id)}
            />
          ))}
        </View>
      </FormModal>

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={data => {
          setQ(data)
          const hit = catalog.findByBarcode(data)
          if (hit) addToCart(hit)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: {
    padding: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
    minHeight: 64,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: { fontSize: 15, fontWeight: '800' },
  productMeta: { fontSize: 12, marginTop: 2 },
  productPriceCol: { alignItems: 'flex-end', gap: 3 },
  productPriceText: { fontSize: 16, fontWeight: '900' },
  inCartBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inCartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  floatingCartBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cartBarCountText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  cartBarTotalText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  checkoutTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 46,
  },
  checkoutTriggerText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 6, marginBottom: 4 },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cartItemName: { fontSize: 14, fontWeight: '700' },
  qtyControlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValueText: { fontSize: 15, fontWeight: '900', minWidth: 20, textAlign: 'center' },
  paymentChipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
})
