import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useAppTheme } from '@/lib/ThemeContext'
import { DEFAULT_PLATFORM_YENILIKLER } from '@/lib/default-yenilikler'

type Yenilik = {
  id: string
  title: string
  summary: string
  content: string
  category: string
  published_at: string
}

const CATEGORY_LABEL: Record<string, string> = {
  ozellik: 'Yeni Özellik',
  iyilestirme: 'İyileştirme',
  duzeltme: 'Düzeltme',
  duyuru: 'Duyuru',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function YeniliklerScreen() {
  const { session } = useAuth()
  const { colors } = useAppTheme()
  const [items, setItems] = useState<Yenilik[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('platform_yenilikler')
        .select('id, title, summary, content, category, published_at')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(40)
      if (Array.isArray(data) && data.length > 0) {
        setItems(data as Yenilik[])
      } else {
        setItems(DEFAULT_PLATFORM_YENILIKLER as Yenilik[])
      }

      const uid = session?.user?.id
      if (uid) {
        const { data: reads } = await supabase
          .from('platform_yenilik_reads')
          .select('yenilik_id')
          .eq('user_id', uid)
        setReadIds(new Set((reads ?? []).map((r: { yenilik_id: string }) => r.yenilik_id)))
      }
    } catch {
      setItems(DEFAULT_PLATFORM_YENILIKLER as Yenilik[])
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function openItem(item: Yenilik) {
    setExpanded(prev => (prev === item.id ? null : item.id))
    const uid = session?.user?.id
    if (!uid || readIds.has(item.id)) return
    setReadIds(prev => new Set([...prev, item.id]))
    try {
      await supabase.from('platform_yenilik_reads').upsert({
        user_id: uid,
        yenilik_id: item.id,
        read_at: new Date().toISOString(),
      })
    } catch {
      /* ignore */
    }
  }

  const unread = items.filter(i => !readIds.has(i.id)).length

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Yenilikler</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        {unread > 0 ? `${unread} okunmamış yenilik` : 'Platform güncellemeleri'}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : items.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusLg }]}>
          <Text style={{ color: colors.muted }}>Henüz yayınlanmış yenilik yok.</Text>
        </View>
      ) : (
        items.map(item => {
          const open = expanded === item.id
          const unreadItem = !readIds.has(item.id)
          return (
            <Pressable
              key={item.id}
              onPress={() => void openItem(item)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: unreadItem ? colors.primary : colors.border,
                  borderRadius: colors.radiusLg,
                },
              ]}
            >
              <View style={styles.metaRow}>
                <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
                  {CATEGORY_LABEL[item.category] ?? item.category}
                </Text>
                {unreadItem && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                <Text style={{ marginLeft: 'auto', fontSize: 11, color: colors.muted }}>{formatDate(item.published_at)}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>{item.title}</Text>
              {!!item.summary && <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{item.summary}</Text>}
              {open && !!item.content && (
                <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
                  {item.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                </Text>
              )}
            </Pressable>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
