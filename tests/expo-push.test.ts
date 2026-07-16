import { describe, it, expect } from 'vitest'
import { shouldNotifyPush } from '@/lib/expo-push'

describe('expo-push triggers', () => {
  it('notifies on approval and ready statuses', () => {
    expect(shouldNotifyPush('onay_bekleniyor')).toBe(true)
    expect(shouldNotifyPush('customer_approval_pending')).toBe(true)
    expect(shouldNotifyPush('kalite_kontrol')).toBe(true)
    expect(shouldNotifyPush('teslime_hazir')).toBe(true)
    expect(shouldNotifyPush('ready_for_pickup')).toBe(true)
  })

  it('skips unrelated statuses', () => {
    expect(shouldNotifyPush('alindi')).toBe(false)
    expect(shouldNotifyPush('tamir')).toBe(false)
    expect(shouldNotifyPush('teslim')).toBe(false)
  })
})
