export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function sanitizeSearch(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')

    if (!q || q.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const safe = sanitizeSearch(q)

    // service_orders tablosunda ara
    const { data, error } = await supabase
      .from('service_orders')
      .select('id, order_no, device_brand, device_model, status, customers(full_name, phone)')
      .or(`order_no.ilike.%${safe}%,device_brand.ilike.%${safe}%,device_model.ilike.%${safe}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({ results: data })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ results: [] })
  }
}
