-- ============================================================================
-- AURA İNTEGRA — KASA 2.0: POS & SERVICE DELIVERY FINANCE INTEGRATION
-- ============================================================================
-- 1. POS Satış RPC Güncellemesi (Kasa 2.0 Accounts, Multi-Account, No Shift Dependency)
-- 2. Servis Teslim RPC Güncellemesi (Kasa 2.0 Accounts, Multi-Account, No Shift Dependency)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. complete_pos_sale RPC
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION complete_pos_sale(
  p_tenant_id UUID,
  p_user_id UUID,
  p_items JSONB,
  p_customer_name TEXT DEFAULT 'Perakende',
  p_payment_method TEXT DEFAULT 'nakit',
  p_vat_rate NUMERIC DEFAULT 20,
  p_sale_id UUID DEFAULT NULL,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID := COALESCE(p_sale_id, gen_random_uuid());
  v_tx_id UUID := gen_random_uuid();
  v_item JSONB;
  v_stock_id UUID;
  v_qty NUMERIC;
  v_unit NUMERIC;
  v_name TEXT;
  v_buy NUMERIC;
  v_avail NUMERIC;
  v_subtotal NUMERIC := 0;
  v_cost NUMERIC := 0;
  v_vat NUMERIC;
  v_total NUMERIC;
  v_shift_id UUID;
  v_balance NUMERIC;
  v_account_id UUID := p_account_id;
  v_account_balance NUMERIC;
  v_pm TEXT := lower(COALESCE(NULLIF(trim(p_payment_method), ''), 'nakit'));
  v_margin NUMERIC;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sepet boş';
  END IF;

  -- 1. Stok Doğrulama ve Satır Kilitleme
  FOR v_stock_id, v_qty IN
    SELECT (e->>'stock_id')::UUID, SUM((e->>'qty')::NUMERIC)
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1
  LOOP
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Geçersiz miktar';
    END IF;
    SELECT stock_qty, name INTO v_avail, v_name
    FROM parts WHERE tenant_id = p_tenant_id AND id = v_stock_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stok bulunamadı: %', v_stock_id;
    END IF;
    IF v_avail < v_qty THEN
      RAISE EXCEPTION 'Yetersiz stok: % (mevcut: %)', v_name, v_avail;
    END IF;
  END LOOP;

  -- 2. Stok Düşümü ve Maliyet Hesabı
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_stock_id := (v_item->>'stock_id')::UUID;
    v_qty := (v_item->>'qty')::NUMERIC;
    v_unit := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
    v_name := COALESCE(v_item->>'name', 'Ürün');

    SELECT COALESCE(purchase_price, 0) INTO v_buy
    FROM parts WHERE tenant_id = p_tenant_id AND id = v_stock_id;

    UPDATE parts
    SET stock_qty = stock_qty - v_qty
    WHERE tenant_id = p_tenant_id AND id = v_stock_id;

    INSERT INTO stock_movements (tenant_id, part_id, movement_type, quantity, notes, reference_id, created_by)
    VALUES (p_tenant_id, v_stock_id, 'cikis', v_qty, 'POS satış — ' || v_name, v_sale_id, p_user_id);

    v_subtotal := v_subtotal + (v_unit * v_qty);
    v_cost := v_cost + (COALESCE(v_buy, 0) * v_qty);
  END LOOP;

  v_vat := ROUND(v_subtotal * (COALESCE(p_vat_rate, 20) / 100.0), 2);
  v_total := v_subtotal + v_vat;
  v_margin := CASE WHEN v_subtotal > 0 THEN ROUND(((v_subtotal - v_cost) / v_subtotal) * 100, 2) ELSE 0 END;

  -- 3. Vardiya Lookup (Opsiyonel / Bağımlılık Yok)
  SELECT id INTO v_shift_id
  FROM cash_shifts
  WHERE tenant_id = p_tenant_id AND status = 'open'
  LIMIT 1;

  -- 4. Kasa 2.0 Hesap Çözümü
  IF v_account_id IS NOT NULL THEN
    -- İstemci açık account_id vermişse tenant ve aktiflik kontrolü
    PERFORM 1 FROM accounts WHERE id = v_account_id AND tenant_id = p_tenant_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Belirtilen hesap bulunamadı veya pasif durumda';
    END IF;
  ELSE
    -- Hesapların var olduğundan emin ol
    PERFORM ensure_tenant_default_accounts(p_tenant_id);

    -- Payment method'a göre hesap çöz
    IF v_pm IN ('nakit') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type IN ('kasa', 'nakit') AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    ELSIF v_pm IN ('kredi_karti', 'kart', 'pos') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type = 'pos' AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    ELSIF v_pm IN ('havale', 'eft', 'banka', 'banka_havalesi', 'transfer') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type = 'banka' AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    ELSIF v_pm IN ('veresiye', 'cek', 'senet') THEN
      v_account_id := NULL; -- Likit olmayan tahakkuk, hesap bakiyesi değişmez
    ELSE
      -- Bilinmeyen yöntem -> Nakit Kasa fallback
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type IN ('kasa', 'nakit') AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    END IF;

    -- Eğer hala bulunamadıysa (özel durum) aktif herhangi bir hesaba bağla
    IF v_account_id IS NULL AND v_pm NOT IN ('veresiye', 'cek', 'senet') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    END IF;
  END IF;

  -- 5. Sales Kaydı
  INSERT INTO sales (
    id, tenant_id, customer_name, items, subtotal, total, cost_price, gross_profit,
    expense_total, net_profit, vat_rate, vat_amount, payment_method, sold_by, extra, created_at
  ) VALUES (
    v_sale_id, p_tenant_id, COALESCE(NULLIF(trim(p_customer_name), ''), 'Perakende'),
    p_items, v_subtotal, v_total, v_cost, v_subtotal - v_cost,
    0, v_subtotal - v_cost, COALESCE(p_vat_rate, 20), v_vat, v_pm, p_user_id,
    jsonb_build_object(
      'expenses', '[]'::jsonb,
      'profit_margin', v_margin,
      'total_with_vat', v_total,
      'cash_shift_id', v_shift_id,
      'account_id', v_account_id
    ),
    NOW()
  );

  -- 6. Financial Transaction (Ledger) Kaydı
  INSERT INTO financial_transactions (
    id, tenant_id, type, description, category, amount, payment_method,
    transaction_date, customer_name, created_by, reference_id, account_id
  ) VALUES (
    v_tx_id, p_tenant_id, 'gelir',
    'POS Satış',
    'Satış', v_total, v_pm, NOW(),
    COALESCE(NULLIF(trim(p_customer_name), ''), 'Perakende'),
    p_user_id, v_shift_id, v_account_id
  );

  -- 7. Veresiye Tahakkuku (Cari Borç Kaydı)
  IF v_pm = 'veresiye' THEN
    INSERT INTO financial_transactions (
      tenant_id, type, description, category, amount, payment_method,
      transaction_date, customer_name, created_by
    ) VALUES (
      p_tenant_id, 'gider', 'Veresiye satış', 'Cari Borç', v_total, 'veresiye',
      NOW(), COALESCE(NULLIF(trim(p_customer_name), ''), 'Perakende'), p_user_id
    );
  END IF;

  -- 8. Kasa 2.0 Bakiye Güncellemesi
  IF v_account_id IS NOT NULL THEN
    v_account_balance := adjust_account_balance(p_tenant_id, v_account_id, v_total);
  END IF;

  -- 9. Legacy Kasa Güncellemesi (Geriye Dönük Uyumluluk)
  IF v_pm = 'nakit' THEN
    BEGIN
      v_balance := adjust_kasa_balance(p_tenant_id, v_total);
    EXCEPTION WHEN OTHERS THEN
      v_balance := v_account_balance;
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'sale_id', v_sale_id,
    'transaction_id', v_tx_id,
    'account_id', v_account_id,
    'account_balance', v_account_balance,
    'subtotal', v_subtotal,
    'vat_amount', v_vat,
    'total_with_vat', v_total,
    'cost_price', v_cost,
    'kasa_balance', COALESCE(v_account_balance, v_balance),
    'cash_shift_id', v_shift_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, NUMERIC, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, NUMERIC, UUID) TO service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. complete_service_delivery RPC
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION complete_service_delivery(
  p_tenant_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_service_fee NUMERIC,
  p_payment_method TEXT DEFAULT 'nakit',
  p_used_parts JSONB DEFAULT '[]'::JSONB,
  p_warranty_months INT DEFAULT NULL,
  p_final_checks JSONB DEFAULT NULL,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_part JSONB;
  v_stock_id UUID;
  v_qty NUMERIC;
  v_unit_buy NUMERIC;
  v_name TEXT;
  v_avail NUMERIC;
  v_total_expense NUMERIC := 0;
  v_delivered_at TIMESTAMPTZ := NOW();
  v_finance_tx_id UUID := gen_random_uuid();
  v_pm TEXT := lower(COALESCE(NULLIF(trim(p_payment_method), ''), 'nakit'));
  v_shift_id UUID;
  v_balance NUMERIC;
  v_account_id UUID := p_account_id;
  v_account_balance NUMERIC;
  v_meta JSONB;
  v_used_meta JSONB := '[]'::JSONB;
  v_net_profit NUMERIC;
  v_warranty_id UUID;
  v_start DATE;
  v_end DATE;
  v_deducted BOOLEAN;
BEGIN
  IF p_service_fee IS NULL OR p_service_fee <= 0 THEN
    RAISE EXCEPTION 'service_fee pozitif olmalı';
  END IF;

  -- 1. Sipariş Durumu ve Kilit
  SELECT * INTO v_order
  FROM service_orders
  WHERE tenant_id = p_tenant_id AND id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Servis kaydı bulunamadı';
  END IF;

  IF v_order.status = 'teslim' THEN
    RAISE EXCEPTION 'Bu iş zaten teslim edilmiş';
  END IF;

  -- 2. Duplicate Finans Kontrolü
  IF EXISTS (
    SELECT 1 FROM financial_transactions
    WHERE tenant_id = p_tenant_id
      AND service_id = p_order_id
      AND category = 'Servis Teslim'
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Bu iş için finans kaydı zaten var';
  END IF;

  v_meta := COALESCE(v_order.metadata, '{}'::JSONB);

  -- 3. Parça Kullanımı ve Stok Düşümü
  FOR v_part IN SELECT * FROM jsonb_array_elements(COALESCE(p_used_parts, '[]'::JSONB))
  LOOP
    v_stock_id := (v_part->>'stock_id')::UUID;
    v_qty := COALESCE((v_part->>'qty')::NUMERIC, 0);
    v_unit_buy := COALESCE((v_part->>'unit_buy')::NUMERIC, 0);
    v_name := COALESCE(v_part->>'name', 'Parça');
    v_deducted := COALESCE((v_part->>'stock_deducted')::BOOLEAN, false);

    IF v_stock_id IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    v_total_expense := v_total_expense + (v_unit_buy * v_qty);

    IF v_deducted THEN
      v_used_meta := v_used_meta || jsonb_build_array(jsonb_build_object(
        'id', v_stock_id, 'stock_id', v_stock_id, 'name', v_name,
        'qty', v_qty, 'unit_buy', v_unit_buy,
        'unit_sell', COALESCE((v_part->>'unit_sell')::NUMERIC, 0),
        'stock_deducted', true
      ));
      CONTINUE;
    END IF;

    SELECT stock_qty, name INTO v_avail, v_name
    FROM parts
    WHERE tenant_id = p_tenant_id AND id = v_stock_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parça bulunamadı: %', v_stock_id;
    END IF;

    IF v_avail < v_qty THEN
      RAISE EXCEPTION 'Yetersiz stok: % (mevcut: %)', v_name, v_avail;
    END IF;

    UPDATE parts
    SET stock_qty = stock_qty - v_qty
    WHERE tenant_id = p_tenant_id AND id = v_stock_id;

    INSERT INTO stock_movements (
      tenant_id, part_id, movement_type, quantity, notes, reference_id, created_by
    ) VALUES (
      p_tenant_id, v_stock_id, 'cikis', v_qty,
      'Servis teslim — ' || v_order.order_no,
      p_order_id, p_user_id
    );

    v_used_meta := v_used_meta || jsonb_build_array(jsonb_build_object(
      'id', v_stock_id, 'stock_id', v_stock_id, 'name', v_name,
      'qty', v_qty, 'unit_buy', v_unit_buy,
      'unit_sell', COALESCE((v_part->>'unit_sell')::NUMERIC, 0),
      'stock_deducted', true
    ));
  END LOOP;

  v_net_profit := p_service_fee - v_total_expense;

  -- 4. Vardiya Lookup (Opsiyonel / Bağımlılık Yok)
  SELECT id INTO v_shift_id
  FROM cash_shifts
  WHERE tenant_id = p_tenant_id AND status = 'open'
  LIMIT 1;

  -- 5. Kasa 2.0 Hesap Çözümü
  IF v_account_id IS NOT NULL THEN
    PERFORM 1 FROM accounts WHERE id = v_account_id AND tenant_id = p_tenant_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Belirtilen hesap bulunamadı veya pasif durumda';
    END IF;
  ELSE
    -- Hesapların var olduğundan emin ol
    PERFORM ensure_tenant_default_accounts(p_tenant_id);

    IF v_pm IN ('nakit') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type IN ('kasa', 'nakit') AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    ELSIF v_pm IN ('kredi_karti', 'kart', 'pos') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type = 'pos' AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    ELSIF v_pm IN ('havale', 'eft', 'banka', 'banka_havalesi', 'transfer') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type = 'banka' AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    ELSIF v_pm IN ('veresiye', 'cek', 'senet') THEN
      v_account_id := NULL;
    ELSE
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND type IN ('kasa', 'nakit') AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    END IF;

    -- Eğer hala bulunamadıysa (özel durum) aktif herhangi bir hesaba bağla
    IF v_account_id IS NULL AND v_pm NOT IN ('veresiye', 'cek', 'senet') THEN
      SELECT id INTO v_account_id FROM accounts
      WHERE tenant_id = p_tenant_id AND is_active = true
      ORDER BY is_default DESC, created_at ASC LIMIT 1;
    END IF;
  END IF;

  -- 6. Financial Transaction (Ledger) Kaydı
  INSERT INTO financial_transactions (
    id, tenant_id, type, description, category, amount, payment_method,
    transaction_date, customer_name, order_no, service_id, financial_posted,
    created_by, reference_id, account_id
  ) VALUES (
    v_finance_tx_id, p_tenant_id, 'gelir',
    'Servis teslim — ' || v_order.order_no,
    'Servis Teslim', p_service_fee, v_pm, v_delivered_at,
    v_order.customer_name, v_order.order_no, p_order_id, true,
    p_user_id, v_shift_id, v_account_id
  );

  -- 7. Veresiye Tahakkuku (Cari Borç)
  IF v_pm = 'veresiye' THEN
    INSERT INTO financial_transactions (
      tenant_id, type, description, category, amount, payment_method,
      transaction_date, customer_name, order_no, service_id, created_by
    ) VALUES (
      p_tenant_id, 'gider',
      'Veresiye teslim — ' || v_order.order_no,
      'Cari Borç', p_service_fee, 'veresiye', v_delivered_at,
      v_order.customer_name, v_order.order_no, p_order_id, p_user_id
    );
  END IF;

  -- 8. Kasa 2.0 Bakiye Güncellemesi
  IF v_account_id IS NOT NULL THEN
    v_account_balance := adjust_account_balance(p_tenant_id, v_account_id, p_service_fee);
  END IF;

  -- 9. Legacy Kasa Güncellemesi
  IF v_pm = 'nakit' THEN
    BEGIN
      v_balance := adjust_kasa_balance(p_tenant_id, p_service_fee);
    EXCEPTION WHEN OTHERS THEN
      v_balance := v_account_balance;
    END;
  END IF;

  -- 10. Service Order State Güncellemesi
  UPDATE service_orders
  SET
    status = 'teslim',
    actual_cost = p_service_fee,
    closed_at = v_delivered_at,
    updated_at = v_delivered_at,
    metadata = v_meta || jsonb_build_object(
      'used_parts', v_used_meta,
      'final_checks', COALESCE(p_final_checks, v_meta->'final_checks'),
      'financial_posted', true,
      'net_profit', v_net_profit,
      'delivered_at', v_delivered_at,
      'account_id', v_account_id
    )
  WHERE tenant_id = p_tenant_id AND id = p_order_id;

  -- 11. Status History Kaydı
  INSERT INTO service_status_history (order_id, tenant_id, status, note, created_by)
  VALUES (p_order_id, p_tenant_id, 'teslim', 'Teslim edildi (RPC).', p_user_id);

  -- 12. Garanti Üretimi
  IF p_warranty_months IS NOT NULL AND p_warranty_months > 0 THEN
    v_warranty_id := gen_random_uuid();
    v_start := v_delivered_at::DATE;
    v_end := (v_start + (p_warranty_months || ' months')::INTERVAL)::DATE;

    INSERT INTO warranties (
      id, tenant_id, order_id, imei,
      device_brand, device_model, warranty_months, start_date, end_date,
      covered_parts, terms, status, claim_status, created_by, created_at
    ) VALUES (
      v_warranty_id, p_tenant_id, p_order_id, v_order.imei,
      v_order.device_brand, v_order.device_model, p_warranty_months,
      v_start, v_end,
      ARRAY['İşçilik', 'Değiştirilen Parçalar'],
      'Servis sonrası garanti', 'aktif', 'yok', p_user_id, v_delivered_at
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'finance_tx_id', v_finance_tx_id,
    'account_id', v_account_id,
    'account_balance', v_account_balance,
    'service_fee', p_service_fee,
    'total_expense', v_total_expense,
    'net_profit', v_net_profit,
    'profit_margin', CASE WHEN p_service_fee > 0
      THEN ROUND((v_net_profit / p_service_fee) * 10000) / 100 ELSE 0 END,
    'kasa_balance', COALESCE(v_account_balance, v_balance),
    'delivered_at', v_delivered_at,
    'warranty_id', v_warranty_id,
    'cash_shift_id', v_shift_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_service_delivery(
  UUID, UUID, UUID, NUMERIC, TEXT, JSONB, INT, JSONB, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION complete_service_delivery(
  UUID, UUID, UUID, NUMERIC, TEXT, JSONB, INT, JSONB
) TO service_role;

NOTIFY pgrst, 'reload schema';
