import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { verifyCronRequest } from '@/lib/cron-auth'
import { NextRequest } from 'next/server'

describe('verifyCronRequest', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('CRON_SECRET eşleşiyorsa null döner (geçti)', async () => {
    process.env.CRON_SECRET = 'super-secret-key'
    process.env.NODE_ENV = 'test'

    const req = new NextRequest('http://localhost/api/cron/test', {
      headers: { authorization: 'Bearer super-secret-key' },
    })
    const result = verifyCronRequest(req)
    expect(result).toBeNull()
  })

  it('CRON_SECRET yanlışsa 401 döner', () => {
    process.env.CRON_SECRET = 'super-secret-key'
    process.env.NODE_ENV = 'test'

    const req = new NextRequest('http://localhost/api/cron/test', {
      headers: { authorization: 'Bearer wrong-key' },
    })
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('Authorization header yoksa 401 döner', () => {
    process.env.CRON_SECRET = 'super-secret-key'
    process.env.NODE_ENV = 'test'

    const req = new NextRequest('http://localhost/api/cron/test')
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('CRON_SECRET yoksa ve dev mod değilse 503 döner', () => {
    delete process.env.CRON_SECRET
    delete process.env.CRON_ALLOW_DEV
    process.env.NODE_ENV = 'development'

    const req = new NextRequest('http://localhost/api/cron/test')
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(503)
  })

  it('CRON_ALLOW_DEV=1 ise geliştirme ortamında izin verir', () => {
    delete process.env.CRON_SECRET
    process.env.CRON_ALLOW_DEV = '1'
    process.env.NODE_ENV = 'development'

    const req = new NextRequest('http://localhost/api/cron/test')
    const result = verifyCronRequest(req)
    expect(result).toBeNull()
  })

  it('CRON_SECRET yoksa ve production ise 503 döner', () => {
    delete process.env.CRON_SECRET
    delete process.env.CRON_ALLOW_DEV
    process.env.NODE_ENV = 'production'

    const req = new NextRequest('http://localhost/api/cron/test')
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(503)
  })
})
