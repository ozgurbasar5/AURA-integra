import { describe, it, expect } from 'vitest'
import { getWhatsAppProvider, buildWaMeUrl } from '@/lib/whatsapp/provider'
import { getErpConnector } from '@/lib/erp'

describe('whatsapp provider', () => {
  it('defaults to wa_me and builds url', async () => {
    const p = getWhatsAppProvider()
    expect(p.id).toBe('wa_me')
    const r = await p.send({ to: '05551234567', message: 'Merhaba' })
    expect(r.ok).toBe(true)
    expect(r.waMeUrl).toContain('wa.me')
    expect(buildWaMeUrl('905551234567', 'hi')).toContain('905551234567')
  })
})

describe('erp csv', () => {
  it('csv connector is ready', async () => {
    const c = getErpConnector('mikro')
    expect(c.id).toBe('mikro')
    const t = await c.test()
    expect(t.ok).toBe(true)
  })
})
