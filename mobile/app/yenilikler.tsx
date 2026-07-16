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
import { AuraColors } from '@/constants/AuraColors'
import { useAuth } from '@/lib/auth'

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

      setItems((data as Yenilik[]) ?? [])

      const uid = session?.user?.id
      if (uid) {
        const { data: reads } = await supabase
          .from('platform_yenilik_reads')
          .select('yenilik_id')
          .eq('user_id', uid)
        setReadIds(new Set((reads ?? []).map((r: { yenilik_id: string }) => r.yenilik_id)))
      }
    } catch {
      setItems([])
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
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Yenilikler</Text>
      <Text style={styles.muted}>
        {unread > 0 ? `${unread} okunmamış yenilik` : 'Platform güncellemeleri'}
      </Text>

      {loading ? (
        <ActivityIndicator color={AuraColors.primary} style={{ marginTop: 24 }} />
      ) : items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.row}>Henüz yayınlanmış yenilik yok.</Text>
        </View>
      ) : (
        items.map(item => {
          const open = expanded === item.id
          const unreadItem = !readIds.has(item.id)
          return (
            <Pressable
              key={item.id}
              onPress={() => void openItem(item)}
              style={[styles.card, unreadItem && styles.cardUnread]}
            >
              <View style={styles.metaRow}>
                <Text style={styles.badge}>
                  {CATEGORY_LABEL[item.category] ?? item.category}
                </Text>
                {unreadItem && <View style={styles.dot} />}
                <Text style={styles.date}>{formatDate(item.published_at)}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!!item.summary && <Text style={styles.row}>{item.summary}</Text>}
              {open && !!item.content && (
                <Text style={[styles.row, { marginTop: 8 }]}>
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
  root: { flex: 1, backgroundColor: AuraColors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  h1: { fontSize: 22, fontWeight: '900', color: AuraColors.text },
  muted: { color: AuraColors.muted, marginBottom: 8 },
  card: {
    backgroundColor: AuraColors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AuraColors.border,
    gap: 6,
  },
  cardUnread: {
    borderColor: AuraColors.primary,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: AuraColors.primary,
    backgroundColor: '#e0f2fe',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AuraColors.primary,
  },
  date: { marginLeft: 'auto', fontSize: 11, color: AuraColors.muted },
  cardTitle: { fontWeight: '800', color: AuraColors.text, fontSize: 16 },
  row: { color: AuraColors.muted, fontSize: 14, lineHeight: 20 },
})
