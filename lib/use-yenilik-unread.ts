'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useYenilikUnread() {
  const supabase = createClient()
  const [unread, setUnread] = useState(0)
  const [latestTitle, setLatestTitle] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      const { data: items } = await (supabase.from('platform_yenilikler') as any)
        .select('id, title, published_at')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(20)

      if (!items?.length) {
        setUnread(0)
        setLatestTitle(null)
        return
      }

      setLatestTitle(items[0].title)

      if (!uid) {
        setUnread(items.length)
        return
      }

      const { data: reads } = await (supabase.from('platform_yenilik_reads') as any)
        .select('yenilik_id')
        .eq('user_id', uid)

      const readSet = new Set((reads ?? []).map((r: { yenilik_id: string }) => r.yenilik_id))
      setUnread(items.filter((i: { id: string }) => !readSet.has(i.id)).length)
    } catch {
      setUnread(0)
    }
  }, [supabase])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return { unread, latestTitle, refresh }
}
