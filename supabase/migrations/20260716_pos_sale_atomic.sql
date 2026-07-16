-- POS satış atomik RPC: stok + satış + finans + (opsiyonel) kasa tek transaction

CREATE OR REPLACE FUNCTION complete_pos_sale(
  p_tenant_id UUID,
  p_user_id UUID,
  p_items JSONB,
  p_customer_name TEXT DEFAULT 'Perakende',
  p_payment_method TEXT DEFAULT 'nakit',
  p_vat_rate NUMERIC DEFAULT 20,
  p_sale_id UUID DEFAULT NULL
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
  v_pm TEXT := lower(COALESCE(NULLIF(trim(p_payment_method), ''), 'nakit'));
  v_margin NUMERIC;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sepet boş';
  END IF;

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

  SELECT id INTO v_shift_id
  FROM cash_shifts
  WHERE tenant_id = p_tenant_id AND status = 'open'
  LIMIT 1;

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
      'cash_shift_id', v_shift_id
    ),
    NOW()
  );

  INSERT INTO financial_transactions (
    id, tenant_id, type, description, category, amount, payment_method,
    transaction_date, customer_name, created_by, reference_id
  ) VALUES (
    v_tx_id, p_tenant_id, 'gelir',
    'POS Satış',
    'Satış', v_total, v_pm, NOW(),
    COALESCE(NULLIF(trim(p_customer_name), ''), 'Perakende'),
    p_user_id, v_shift_id
  );

  IF v_pm = 'veresiye' THEN
    INSERT INTO financial_transactions (
      tenant_id, type, description, category, amount, payment_method,
      transaction_date, customer_name, created_by
    ) VALUES (
      p_tenant_id, 'gider', 'Veresiye satış', 'Cari Borç', v_total, 'veresiye',
      NOW(), COALESCE(NULLIF(trim(p_customer_name), ''), 'Perakende'), p_user_id
    );
  END IF;

  IF v_pm = 'nakit' THEN
    v_balance := adjust_kasa_balance(p_tenant_id, v_total);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'sale_id', v_sale_id,
    'transaction_id', v_tx_id,
    'subtotal', v_subtotal,
    'vat_amount', v_vat,
    'total_with_vat', v_total,
    'cost_price', v_cost,
    'kasa_balance', v_balance,
    'cash_shift_id', v_shift_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_pos_sale(UUID, UUID, JSONB, TEXT, TEXT, NUMERIC, UUID) TO service_role;
