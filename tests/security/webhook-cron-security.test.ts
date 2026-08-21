import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
} from '../api/helpers/api-client'
import { getServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

describe('Security: Webhook Signature & Cron Secret Defense', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.mocked(getServiceClient).mockReset()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_key_12345'
    process.env.IYZICO_SECRET = 'iyzico_test_secret_key_12345'
    process.env.CRON_SECRET = 'cron_super_secret_token_12345'
  })

  describe('1. Stripe Webhook Security', () => {
    it('Geçersiz / sahte imza (stripe-signature) ile gelen istekler 401 ile reddedilir', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route')
      const req = createMockNextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1600000000,v1=forged_invalid_signature_hash',
        },
        body: { type: 'customer.subscription.updated' },
      })

      const res = await POST(req)
      await assertStatus(res, 401, 'Stripe Forged Signature')
    })
  })

  describe('2. iyzico Webhook Security', () => {
    it('Geçersiz / sahte imza (x-iyz-signature) ile gelen istekler 401 ile reddedilir', async () => {
      const { POST } = await import('@/app/api/webhooks/iyzico/route')
      const req = createMockNextRequest('http://localhost/api/webhooks/iyzico', {
        method: 'POST',
        headers: {
          'x-iyz-signature': 'forged_iyzico_signature_hash',
        },
        body: { status: 'success', paymentId: '123' },
      })

      const res = await POST(req)
      await assertStatus(res, 401, 'iyzico Forged Signature')
    })
  })

  describe('3. Cron Job Security', () => {
    it('CRON_SECRET olmadan doğrudan tarayıcı veya yetkisiz çağrı yapıldığında 401 Unauthorized döner', async () => {
      const { GET } = await import('@/app/api/cron/sla-check/route')
      const req = createMockNextRequest('http://localhost/api/cron/sla-check', {
        headers: {
          // Authorization başlığı yok veya yanlış secret!
          authorization: 'Bearer wrong_secret_key',
        },
      })

      const res = await GET(req as unknown as Request)
      expect(res.status).toBe(401)
    }, 15000)
  })
})
