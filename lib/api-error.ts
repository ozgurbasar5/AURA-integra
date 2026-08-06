import { NextResponse } from 'next/server'
import { captureException } from '@/lib/sentry'

const IS_PROD = process.env.NODE_ENV === 'production'

/** İstemciye güvenli hata mesajı — prod'da DB detayı sızdırmaz */
export function safeClientMessage(err: unknown, fallback = 'Sunucu hatası'): string {
  if (!IS_PROD && err instanceof Error) return err.message
  return fallback
}

/** PostgREST/DB hataları için log + güvenli JSON yanıt */
export async function dbErrorResponse(
  err: unknown,
  opts?: { status?: number; fallback?: string; context?: Record<string, string> },
): Promise<NextResponse> {
  await captureException(err, opts?.context)
  return NextResponse.json(
    { error: safeClientMessage(err, opts?.fallback ?? 'Veritabanı hatası') },
    { status: opts?.status ?? 500 },
  )
}
