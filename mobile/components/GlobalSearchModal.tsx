import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '@/lib/api'
import { useAppTheme } from '@/lib/ThemeContext'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'

export type SearchResultItem = {
  type: 'service' | 'customer' | 'stock' | 'invoice'
  id: string
  title: string
  subtitle: string
  href: string
}

type Props = {
  visible: boolean
  onClose: () => void
}

const TYPE_CONFIG = {
  service: { label: 'Servis', icon: 'wrench' as const, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  customer: { label: 'Müşteri', icon: 'user' as const, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  stock: { label: 'Stok/Parça', icon: 'cube' as const, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  invoice: { label: 'Fatura/Kasa', icon: 'file-text-o' as const, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
}

export function GlobalSearchModal({ visible, onClose }: Props) {
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
      setError('')
      setLoading(false)
      if (abortControllerRef.current) abortControllerRef.current.abort()
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [visible])

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError('')
    try {
      const encoded = encodeURIComponent(trimmed)
      const data = (await apiFetch(`/api/search?q=${encoded}`, {
        signal: controller.signal,
      })) as { results?: SearchResultItem[] }
      if (!controller.signal.aborted) {
        setResults(data.results ?? [])
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Arama yapılamadı')
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  const handleTextChange = (text: string) => {
    setQuery(text)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void performSearch(text)
    }, 300)
  }

  const handleSelect = (item: SearchResultItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
    if (item.type === 'service') {
      router.push(`/atolye/${item.id}`)
    } else if (item.type === 'customer') {
      router.push('/musteriler' as never)
    } else if (item.type === 'stock') {
      router.push('/stok' as never)
    } else if (item.type === 'invoice') {
      router.push('/kasa' as never)
    } else {
      router.push(item.href as never)
    }
  }

  const isImei = /^\d{15}$/.test(query.replace(/\D/g, ''))

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Header Search Input */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          <View style={styles.inputContainer}>
            <FontAwesome name="search" size={16} color={colors.primary} style={styles.searchIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Servis no, IMEI, müşteri, parça, barkod…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={handleTextChange}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  setQuery('')
                  setResults([])
                }}
                hitSlop={8}
                style={styles.clearBtn}
              >
                <FontAwesome name="times-circle" size={16} color={colors.muted} />
              </Pressable>
            )}
            <Pressable
              onPress={() => setScanOpen(true)}
              hitSlop={8}
              style={[styles.scanBtn, { backgroundColor: colors.primarySoft }]}
            >
              <FontAwesome name="barcode" size={18} color={colors.primary} />
            </Pressable>
          </View>

          <Pressable onPress={onClose} hitSlop={12} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>Vazgeç</Text>
          </Pressable>
        </View>

        {isImei && (
          <View style={[styles.imeiBanner, { backgroundColor: colors.primarySoft }]}>
            <FontAwesome name="info-circle" size={14} color={colors.primary} />
            <Text style={[styles.imeiBannerText, { color: colors.primary }]}>
              15 haneli IMEI algılandı — Cihaz eşleşmesi önceliklendirildi
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Aranıyor…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerMessage}>
            <FontAwesome name="exclamation-triangle" size={24} color={colors.danger} />
            <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : query.trim().length >= 2 && results.length === 0 ? (
          <View style={styles.centerMessage}>
            <FontAwesome name="search" size={28} color={colors.muted} />
            <Text style={[styles.messageTitle, { color: colors.text }]}>Sonuç Bulunamadı</Text>
            <Text style={[styles.messageText, { color: colors.muted }]}>
              "{query}" için kayıtlı servis, müşteri veya parça bulunamadı.
            </Text>
          </View>
        ) : query.trim().length < 2 ? (
          <View style={styles.centerMessage}>
            <FontAwesome name="keyboard-o" size={32} color={colors.muted} />
            <Text style={[styles.messageTitle, { color: colors.text }]}>Hızlı Arama</Text>
            <Text style={[styles.messageText, { color: colors.muted }]}>
              Aramak için en az 2 karakter girin veya barkod okutun.
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => `${item.type}-${item.id}`}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.service
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.resultCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radiusLg,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={[styles.typeIconBox, { backgroundColor: cfg.bg }]}>
                    <FontAwesome name={cfg.icon} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <Text style={[styles.resultSubtitle, { color: colors.muted }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={colors.muted} />
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
            void performSearch(data)
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearBtn: { padding: 4 },
  scanBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  cancelText: { fontWeight: '700', fontSize: 15 },
  imeiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  imeiBannerText: { fontSize: 12, fontWeight: '700', flex: 1 },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, fontWeight: '600' },
  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  messageTitle: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  messageText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  listContent: { padding: 16, gap: 10 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 64,
    borderWidth: 1,
    gap: 12,
  },
  typeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  resultSubtitle: { fontSize: 12, marginTop: 3 },
})
