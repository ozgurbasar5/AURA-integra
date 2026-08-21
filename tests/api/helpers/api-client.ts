/**
 * AURA İntegra — API Test Helper & Request Builder
 *
 * Route handler'ları çağırmak, mock auth/headers oluşturmak ve
 * HTTP response contract assert'lerini kolaylaştırmak için yardımcılar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { expect } from 'vitest'

export interface MockAuthContext {
  userId?: string
  tenantId?: string
  role?: string
  isActive?: boolean
}

/**
 * NextRequest oluşturucu yardımcı
 */
export function createMockNextRequest(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
    bearerToken?: string
  } = {}
): NextRequest {
  const method = options.method ?? (options.body ? 'POST' : 'GET')
  const reqHeaders = new Headers(options.headers ?? {})

  if (options.bearerToken) {
    reqHeaders.set('authorization', `Bearer ${options.bearerToken}`)
  }

  if (options.body && !reqHeaders.has('content-type')) {
    reqHeaders.set('content-type', 'application/json')
  }

  const reqInit: RequestInit = {
    method,
    headers: reqHeaders,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as never)
}

/**
 * JSON Response Body Ayrıştırıcı
 */
export async function parseJsonResponse<T = Record<string, unknown>>(
  res: NextResponse | Response
): Promise<{ status: number; body: T }> {
  const status = res.status
  let body: T
  try {
    body = (await res.json()) as T
  } catch {
    body = {} as T
  }
  return { status, body }
}

/**
 * HTTP Status Assert Helper
 */
export async function assertStatus(
  res: NextResponse | Response,
  expectedStatus: number,
  contextMsg = 'HTTP Response Status'
): Promise<Record<string, unknown>> {
  const { status, body } = await parseJsonResponse(res)
  expect(
    status,
    `${contextMsg}: beklenen ${expectedStatus}, alınan ${status}. Gövde: ${JSON.stringify(body)}`
  ).toBe(expectedStatus)
  return body as Record<string, unknown>
}

/**
 * 401 Unauthorized Assert
 */
export async function assertUnauthorized(
  res: NextResponse | Response,
  contextMsg = 'Auth Koruma Kontrolü'
): Promise<void> {
  const body = await assertStatus(res, 401, contextMsg)
  expect((body as { error?: string }).error).toBeTruthy()
}

/**
 * 403 Forbidden Assert
 */
export async function assertForbidden(
  res: NextResponse | Response,
  contextMsg = 'Yetki (Role/Tenant) Koruma Kontrolü'
): Promise<void> {
  const body = await assertStatus(res, 403, contextMsg)
  expect((body as { error?: string }).error).toBeTruthy()
}

/**
 * 400 Bad Request Assert
 */
export async function assertBadRequest(
  res: NextResponse | Response,
  expectedErrorSubstring?: string,
  contextMsg = 'Payload / Parametre Doğrulama'
): Promise<Record<string, unknown>> {
  const body = await assertStatus(res, 400, contextMsg)
  if (expectedErrorSubstring) {
    expect(String((body as { error?: string }).error)).toContain(expectedErrorSubstring)
  }
  return body
}

/**
 * 409 Conflict Assert
 */
export async function assertConflict(
  res: NextResponse | Response,
  expectedErrorSubstring?: string,
  contextMsg = 'Durum / Çakışma Kontrolü'
): Promise<Record<string, unknown>> {
  const body = await assertStatus(res, 409, contextMsg)
  if (expectedErrorSubstring) {
    expect(String((body as { error?: string }).error)).toContain(expectedErrorSubstring)
  }
  return body
}
