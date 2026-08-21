import React, { useState, useEffect, useRef } from 'react'
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
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppTheme } from '@/lib/ThemeContext'
import { apiFetch } from '@/lib/api'

export type UniversalSearchResult = {
  id: string
  type: 'service' | 'customer' | 'part' | 'account' | 'user' | 'warranty' | 'ticket' | 'tenant'
  title: string
  subtitle: string
  badge?: string
  href: string
}

type Props = {
  visible: boolean
  onClose: () => void
}

export function AdminSearchModal({ visible, onClose }: Props) {
  const { colors } = useAppTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UniversalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
      return
    }
  }, [visible])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const abortCtrl = new AbortController()
    abortRef.current = abortCtrl

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const json = (await apiFetch(`/api/admin/center?q=${encodeURIComponent(query.trim())}`, {
          fresh: true,
        })) as { ok?: boolean; results?: UniversalSearchResult[] }

        if (!abortCtrl.signal.aborted && json?.ok && Array.isArray(json.results)) {
          setResults(json.results)
        }
      } catch {
        /* ignore abort or network */
      } finally {
        if (!abortCtrl.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      abortCtrl.abort()
    }
  }, [query])

  const handleSelect = (item: UniversalSearchResult) => {
    onClose()
    if (item.type === 'service') {
      router.push('/atolye' as never)
    } else if (item.type === 'part') {
      router.push('/stok' as never)
    } else if (item.type === 'customer') {
      router.push('/musteriler' as never)
    } else {
      router.push('/kasa' as never)
    }
  }

  const getIcon = (type: UniversalSearchResult['type']) => {
    switch (type) {
      case 'service': return 'wrench'
      case 'part': return 'cube'
      case 'customer': return 'user'
      case 'account': return 'credit-card'
      case 'warranty': return 'shield'
      default: return 'building'
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Search Header */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FontAwesome name="search" size={16} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Servis No, Müşteri, Parça, Kasa ara…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : query ? (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
              <FontAwesome name="times-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>Vazgeç</Text>
          </Pressable>
        </View>

        {/* Results List */}
        <FlatList
          data={results}
          keyExtractor={(item, idx) => item.id + idx}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            query.trim().length >= 2 && !loading ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>Sonuç bulunamadı.</Text>
              </View>
            ) : query.trim().length < 2 ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Aramak istediğiniz en az 2 karakteri yazın.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.resultRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <FontAwesome name={getIcon(item.type) as any} size={15} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              {item.badge && (
                <View style={[styles.badge, { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{item.badge}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 4,
  },
  cancelBtn: {
    paddingLeft: 6,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
})
