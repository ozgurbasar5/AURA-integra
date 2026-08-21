import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { usePartsCatalog, type CatalogPart } from '@/lib/PartsCatalog'
import { useAppTheme } from '@/lib/ThemeContext'
import { FormModal } from '@/components/ui/FormModal'
import { SearchBar } from '@/components/ui/SearchBar'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'

type Props = {
  visible: boolean
  onClose: () => void
  onAddPart: (part: { id: string; name: string; purchase_price?: number; sale_price?: number }) => Promise<void>
  busy?: boolean
}

export function QuickPartSheet({ visible, onClose, onAddPart, busy }: Props) {
  const { colors } = useAppTheme()
  const catalog = usePartsCatalog()
  const [query, setQuery] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const parts = useMemo(() => {
    const list = catalog.parts.filter(p => Number(p.stock_qty) > 0)
    if (!query.trim()) return list.slice(0, 30)
    const q = query.toLowerCase()
    return list
      .filter(p => p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q) || (p.brand || '').toLowerCase().includes(q))
      .slice(0, 40)
  }, [catalog.parts, query])

  const handleSelect = async (part: CatalogPart) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setAddingId(part.id)
    try {
      await onAddPart({
        id: part.id,
        name: part.name,
        purchase_price: part.buy_price,
        sale_price: part.sale_price ?? part.sell_price,
      })
      onClose()
    } finally {
      setAddingId(null)
    }
  }

  return (
    <FormModal
      visible={visible}
      title="Parça Ekle"
      onClose={onClose}
    >
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Parça adı veya barkod…"
          />
        </View>
        <Pressable
          style={[styles.scanBtn, { backgroundColor: colors.primaryDark }]}
          onPress={() => setScanOpen(true)}
          accessibilityLabel="Barkod Tara"
        >
          <FontAwesome name="barcode" size={18} color="#fff" />
        </Pressable>
      </View>

      {parts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FontAwesome name="cube" size={32} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {query ? 'Eşleşen Parça Yok' : 'Kullanılabilir Stok Yok'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            {query ? 'Farklı bir arama yapın veya barkod okutun' : 'Stok modülünden parça girişi yapın'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isAdding = addingId === item.id || busy
            const price = item.sale_price ?? item.sell_price ?? item.buy_price ?? 0
            const isLow = Number(item.stock_qty) <= (item.min_stock ?? 2)

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.partRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radiusLg,
                    opacity: isAdding ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
                disabled={isAdding}
                onPress={() => void handleSelect(item)}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                  <FontAwesome name="cube" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.partMeta, { color: colors.muted }]}>
                    Stok: <Text style={{ color: isLow ? colors.warning : colors.primary, fontWeight: '800' }}>{item.stock_qty}</Text>
                    {item.barcode ? ` · ${item.barcode}` : ''}
                  </Text>
                </View>
                <View style={styles.rightAction}>
                  {price > 0 && (
                    <Text style={[styles.priceText, { color: colors.text }]}>
                      {Number(price).toLocaleString('tr-TR')} ₺
                    </Text>
                  )}
                  {isAdding ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={[styles.addPill, { backgroundColor: colors.primary }]}>
                      <Text style={styles.addPillText}>+ Ekle</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            )
          }}
        />
      )}

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={data => {
          setQuery(data)
          const hit = catalog.findByBarcode(data)
          if (hit) void handleSelect(hit)
        }}
      />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partName: { fontSize: 14, fontWeight: '800' },
  partMeta: { fontSize: 12, marginTop: 2 },
  rightAction: { alignItems: 'flex-end', gap: 4 },
  priceText: { fontSize: 13, fontWeight: '800' },
  addPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addPillText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 12, textAlign: 'center' },
})
