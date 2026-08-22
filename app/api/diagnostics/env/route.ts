import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Safe diagnostic endpoint for environment variables verification.
 * Only returns boolean flags. NEVER returns secret values.
 */
export async function GET() {
  return NextResponse.json({
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  })
}
