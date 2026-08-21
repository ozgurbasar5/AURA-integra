-- ============================================================================
-- AURA İNTEGRA — KASA 2.0: ACCOUNTS, LEDGER & ATOMIC TRANSFERS
-- ============================================================================

-- 1. accounts Tablosu (Yoksa Oluştur, Varsa Kolonları Tamamla)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kasa', 'nakit', 'pos', 'banka', 'diger')),
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kolonların mevcut tabloda eksik olmamasını sağla (Idempotent)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. İndeksler ve Kısıtlar
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_tenant_name ON accounts(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_type ON accounts(tenant_id, type);

-- 3. financial_transactions Tablosu Genişletmesi
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS target_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_fin_tx_account ON financial_transactions(tenant_id, account_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_target_account ON financial_transactions(tenant_id, target_account_id);

-- 4. RLS & Yetkiler
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_accounts ON accounts;
CREATE POLICY tenant_isolation_accounts ON accounts
  FOR ALL
  USING (
    tenant_id = (
      COALESCE(
        current_setting('request.jwt.claim.tenant_id', true)::uuid,
        (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
      )
    )
  );

GRANT ALL ON TABLE accounts TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE accounts TO authenticated;

-- 5. Tenant Varsayılan Hesaplarını Oluşturma / Garanti Etme Fonksiyonu
CREATE OR REPLACE FUNCTION ensure_tenant_default_accounts(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Nakit Kasa
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = p_tenant_id AND type IN ('kasa', 'nakit')) THEN
    INSERT INTO accounts (id, tenant_id, name, type, balance, currency, is_default, is_active)
    VALUES (gen_random_uuid(), p_tenant_id, 'Nakit Kasa', 'kasa', 0, 'TRY', true, true);
  END IF;

  -- 2. POS / Kredi Kartı
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = p_tenant_id AND type = 'pos') THEN
    INSERT INTO accounts (id, tenant_id, name, type, balance, currency, is_default, is_active)
    VALUES (gen_random_uuid(), p_tenant_id, 'POS / Kredi Kartı', 'pos', 0, 'TRY', false, true);
  END IF;

  -- 3. Banka Hesabı
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = p_tenant_id AND type = 'banka') THEN
    INSERT INTO accounts (id, tenant_id, name, type, balance, currency, is_default, is_active)
    VALUES (gen_random_uuid(), p_tenant_id, 'Banka Hesabı', 'banka', 0, 'TRY', false, true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_tenant_default_accounts(UUID) TO authenticated, service_role;

-- 6. Atomik Hesap Bakiyesi Güncelleme RPC'si
CREATE OR REPLACE FUNCTION adjust_account_balance(
  p_tenant_id UUID,
  p_account_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF p_delta IS NULL THEN
    RAISE EXCEPTION 'Delta tutarı boş olamaz';
  END IF;

  UPDATE accounts
  SET balance = balance + p_delta,
      updated_at = NOW()
  WHERE id = p_account_id AND tenant_id = p_tenant_id AND is_active = true
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hesap bulunamadı veya pasif durumda (tenant: %, account: %)', p_tenant_id, p_account_id;
  END IF;

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_account_balance(UUID, UUID, NUMERIC) TO authenticated, service_role;

-- 7. Atomik Hesaplar Arası Transfer RPC'si (Zero-Sum Invariant & Row Lock)
CREATE OR REPLACE FUNCTION execute_account_transfer(
  p_tenant_id UUID,
  p_user_id UUID,
  p_source_account_id UUID,
  p_target_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src_bal NUMERIC;
  v_tgt_bal NUMERIC;
  v_src_name TEXT;
  v_tgt_name TEXT;
  v_tx_id UUID := gen_random_uuid();
  v_amount NUMERIC;
BEGIN
  v_amount := ROUND(COALESCE(p_amount, 0), 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer tutarı pozitif olmalıdır: %', p_amount;
  END IF;

  IF p_source_account_id = p_target_account_id THEN
    RAISE EXCEPTION 'Kaynak ve hedef hesap aynı olamaz';
  END IF;

  -- 1. Kaynak hesabı kilitleyerek kontrol et
  SELECT balance, name INTO v_src_bal, v_src_name
  FROM accounts
  WHERE id = p_source_account_id AND tenant_id = p_tenant_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kaynak hesap bulunamadı veya pasif durumda';
  END IF;

  -- 2. Hedef hesabı kilitleyerek kontrol et
  SELECT balance, name INTO v_tgt_bal, v_tgt_name
  FROM accounts
  WHERE id = p_target_account_id AND tenant_id = p_tenant_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hedef hesap bulunamadı veya pasif durumda';
  END IF;

  -- 3. Kaynak hesaptan düş
  UPDATE accounts
  SET balance = balance - v_amount,
      updated_at = NOW()
  WHERE id = p_source_account_id
  RETURNING balance INTO v_src_bal;

  -- 4. Hedef hesaba ekle
  UPDATE accounts
  SET balance = balance + v_amount,
      updated_at = NOW()
  WHERE id = p_target_account_id
  RETURNING balance INTO v_tgt_bal;

  -- 5. Ledger kaydı oluştur
  INSERT INTO financial_transactions (
    id,
    tenant_id,
    type,
    amount,
    category,
    description,
    payment_method,
    account_id,
    target_account_id,
    transaction_date,
    created_by,
    created_at
  ) VALUES (
    v_tx_id,
    p_tenant_id,
    'transfer',
    v_amount,
    'Hesap Transferi',
    COALESCE(NULLIF(trim(p_description), ''), v_src_name || ' -> ' || v_tgt_name || ' Transfer'),
    'transfer',
    p_source_account_id,
    p_target_account_id,
    NOW(),
    p_user_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', v_tx_id,
    'amount', v_amount,
    'source_account_id', p_source_account_id,
    'target_account_id', p_target_account_id,
    'source_balance', v_src_bal,
    'target_balance', v_tgt_bal
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_account_transfer(UUID, UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
