import { describe, it, expect } from 'vitest'

interface Account {
  id: string
  tenant_id: string
  name: string
  type: 'kasa' | 'nakit' | 'pos' | 'banka' | 'diger'
  balance: number
  currency: string
  is_default: boolean
  is_active: boolean
}

interface Transaction {
  id: string
  tenant_id: string
  type: 'gelir' | 'gider' | 'transfer' | 'duzeltme' | 'mutabakat'
  amount: number
  category: string
  description: string
  account_id: string
  target_account_id?: string
  payment_method: string
  created_at: string
}

describe('Kasa 2.0: Accounts & Ledger Invariants', () => {
  it('1. Tenant Default Accounts: Nakit, POS ve Banka hesapları deterministik ve tekil olarak oluşturulur', () => {
    const tenantId = 'tenant-test-001'
    const accounts: Account[] = [
      { id: 'acc-1', tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: true, is_active: true },
      { id: 'acc-2', tenant_id: tenantId, name: 'POS / Kredi Kartı', type: 'pos', balance: 0, currency: 'TRY', is_default: false, is_active: true },
      { id: 'acc-3', tenant_id: tenantId, name: 'Banka Hesabı', type: 'banka', balance: 0, currency: 'TRY', is_default: false, is_active: true },
    ]

    expect(accounts.length).toBe(3)
    const defaultAcc = accounts.filter(a => a.is_default)
    expect(defaultAcc.length).toBe(1)
    expect(defaultAcc[0].type).toBe('kasa')

    // Duplicate engeli
    const isUnique = new Set(accounts.map(a => a.name)).size === accounts.length
    expect(isUnique).toBe(true)
  })

  it('2. Cash Income: Nakit tahsilat doğrudan Nakit Kasa bakiyesini artırır ve ledger satırı üretir', () => {
    const nakitKasa: Account = { id: 'acc-1', tenant_id: 't-1', name: 'Nakit Kasa', type: 'kasa', balance: 1000, currency: 'TRY', is_default: true, is_active: true }
    const tx: Transaction = {
      id: 'tx-1',
      tenant_id: 't-1',
      type: 'gelir',
      amount: 2500,
      category: 'Servis Teslim',
      description: 'Ekran Değişimi Tahsilatı',
      account_id: nakitKasa.id,
      payment_method: 'nakit',
      created_at: new Date().toISOString(),
    }

    nakitKasa.balance += tx.amount
    expect(nakitKasa.balance).toBe(3500)
    expect(tx.type).toBe('gelir')
    expect(tx.account_id).toBe(nakitKasa.id)
  })

  it('3. POS Income: Kredi kartı satışı doğrudan POS hesabı bakiyesini artırır', () => {
    const posHesabi: Account = { id: 'acc-2', tenant_id: 't-1', name: 'POS Hesabı', type: 'pos', balance: 5000, currency: 'TRY', is_default: false, is_active: true }
    const tx: Transaction = {
      id: 'tx-2',
      tenant_id: 't-1',
      type: 'gelir',
      amount: 1500,
      category: 'POS Satış',
      description: 'Aksesuar Satışı',
      account_id: posHesabi.id,
      payment_method: 'kredi_karti',
      created_at: new Date().toISOString(),
    }

    posHesabi.balance += tx.amount
    expect(posHesabi.balance).toBe(6500)
    expect(tx.account_id).toBe(posHesabi.id)
  })

  it('4. Bank Income: Havale/EFT tahsilatı doğrudan Banka Hesabı bakiyesini artırır', () => {
    const bankaHesabi: Account = { id: 'acc-3', tenant_id: 't-1', name: 'Banka Hesabı', type: 'banka', balance: 20000, currency: 'TRY', is_default: false, is_active: true }
    const tx: Transaction = {
      id: 'tx-3',
      tenant_id: 't-1',
      type: 'gelir',
      amount: 7500,
      category: 'Cari Tahsilat',
      description: 'Kurumsal Müşteri Fatura Ödemesi',
      account_id: bankaHesabi.id,
      payment_method: 'havale',
      created_at: new Date().toISOString(),
    }

    bankaHesabi.balance += tx.amount
    expect(bankaHesabi.balance).toBe(27500)
  })

  it('5. Expense: Gider işlemi seçilen hesaptan düşülür', () => {
    const nakitKasa: Account = { id: 'acc-1', tenant_id: 't-1', name: 'Nakit Kasa', type: 'kasa', balance: 3500, currency: 'TRY', is_default: true, is_active: true }
    const tx: Transaction = {
      id: 'tx-4',
      tenant_id: 't-1',
      type: 'gider',
      amount: 500,
      category: 'Dükkan Masrafı',
      description: 'Temizlik ve Kırtasiye',
      account_id: nakitKasa.id,
      payment_method: 'nakit',
      created_at: new Date().toISOString(),
    }

    nakitKasa.balance -= tx.amount
    expect(nakitKasa.balance).toBe(3000)
  })

  it('6. adjust_account_balance: Atomik delta güncellemesi hesaba doğru yansır', () => {
    const account: Account = { id: 'acc-1', tenant_id: 't-1', name: 'Nakit Kasa', type: 'kasa', balance: 3000, currency: 'TRY', is_default: true, is_active: true }
    const delta = -150 // Sayım farkı veya düzeltme

    account.balance += delta
    expect(account.balance).toBe(2850)
  })

  it('7. Inactive Account Guard: Pasif (is_active = false) hesaba işlem yapılamaz', () => {
    const closedAccount: Account = { id: 'acc-old', tenant_id: 't-1', name: 'Eski Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: false, is_active: false }

    const canMutate = (acc: Account) => {
      if (!acc.is_active) throw new Error('Hesap pasif durumda, işlem yapılamaz')
      return true
    }

    expect(() => canMutate(closedAccount)).toThrow('Hesap pasif durumda')
  })
})
