-- Performans: composite index'ler, stok özet cache, atomik teslim RPC

-- ─── Composite indexes (tenant-first) ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_service_orders_tenant_status_created
  ON service_orders (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_orders_tenant_created
  ON service_orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_created
  ON stock_movements (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_part_created
  ON stock_movements (tenant_id, part_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_tx_tenant_service
  ON financial_transactions (tenant_id, service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_tx_tenant_category_created
  ON financial_transactions (tenant_id, category, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_parts_tenant_name
  ON parts (tenant_id, name);

-- service_status_history — tenant_id kolonu + index
ALTER TABLE service_status_history ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE service_status_history ssh
SET tenant_id = so.tenant_id
FROM service_orders so
WHERE ssh.order_id = so.id AND ssh.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ssh_tenant_order_created
  ON service_status_history (tenant_id, order_id, created_at DESC);

-- ─── Tenant stok özet cache ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_stock_summary (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  total_skus INT NOT NULL DEFAULT 0,
  low_stock_count INT NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_stock_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_stock_summary_select ON tenant_stock_summary;
CREATE POLICY tenant_stock_summary_select ON tenant_stock_summary
  FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_super_admin());

CREATE OR REPLACE FUNCTION refresh_tenant_stock_summary(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tenant_stock_summary (tenant_id, total_skus, low_stock_count, total_value, updated_at)
  SELECT
    p_tenant_id,
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE COALESCE(stock_qty, 0) <= COALESCE(min_stock_qty, 0))::INT,
    COALESCE(SUM(COALESCE(stock_qty, 0) * COALESCE(purchase_price, 0)), 0),
    NOW()
  FROM parts
  WHERE tenant_id = p_tenant_id
  ON CONFLICT (tenant_id) DO UPDATE SET
    total_skus = EXCLUDED.total_skus,
    low_stock_count = EXCLUDED.low_stock_count,
    total_value = EXCLUDED.total_value,
    updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION trg_refresh_stock_summary_from_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tid UUID;
BEGIN
  v_tid := COALESCE(NEW.tenant_id, OLD.tenant_id);
  IF v_tid IS NOT NULL THEN
    PERFORM refresh_tenant_stock_summary(v_tid);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_parts_stock_summary ON parts;
CREATE TRIGGER trg_parts_stock_summary
  AFTER INSERT OR UPDATE OR DELETE ON parts
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_stock_summary_from_parts();

CREATE OR REPLACE FUNCTION trg_refresh_stock_summary_from_movements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.tenant_id, OLD.tenant_id) IS NOT NULL THEN
    PERFORM refresh_tenant_stock_summary(COALESCE(NEW.tenant_id, OLD.tenant_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_movements_stock_summary ON stock_movements;
CREATE TRIGGER trg_movements_stock_summary
  AFTER INSERT OR UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_stock_summary_from_movements();

-- Mevcut tenant'lar için ilk doldurma
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT tenant_id FROM parts LOOP
    PERFORM refresh_tenant_stock_summary(r.tenant_id);
  END LOOP;
END;
$$;

GRANT SELECT ON tenant_stock_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_tenant_stock_summary(UUID) TO service_role;

-- ─── Atomik servis teslim RPC ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_service_delivery(
  p_tenant_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_service_fee NUMERIC,
  p_payment_method TEXT DEFAULT 'nakit',
  p_used_parts JSONB DEFAULT '[]'::JSONB,
  p_warranty_months INT DEFAULT NULL,
  p_final_checks JSONB DEFAULT NULL
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

  SELECT id INTO v_shift_id
  FROM cash_shifts
  WHERE tenant_id = p_tenant_id AND status = 'open'
  LIMIT 1;

  INSERT INTO financial_transactions (
    id, tenant_id, type, description, category, amount, payment_method,
    transaction_date, customer_name, order_no, service_id, financial_posted,
    created_by, reference_id
  ) VALUES (
    v_finance_tx_id, p_tenant_id, 'gelir',
    'Servis teslim — ' || v_order.order_no,
    'Servis Teslim', p_service_fee, v_pm, v_delivered_at,
    v_order.customer_name, v_order.order_no, p_order_id, true,
    p_user_id, v_shift_id
  );

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

  IF v_pm = 'nakit' THEN
    v_balance := adjust_kasa_balance(p_tenant_id, p_service_fee);
  END IF;

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
      'delivered_at', v_delivered_at
    )
  WHERE tenant_id = p_tenant_id AND id = p_order_id;

  INSERT INTO service_status_history (order_id, tenant_id, status, note, created_by)
  VALUES (p_order_id, p_tenant_id, 'teslim', 'Teslim edildi (RPC).', p_user_id);

  IF p_warranty_months IS NOT NULL AND p_warranty_months > 0 THEN
    v_warranty_id := gen_random_uuid();
    v_start := v_delivered_at::DATE;
    v_end := (v_start + (p_warranty_months || ' months')::INTERVAL)::DATE;

    INSERT INTO warranties (
      id, tenant_id, order_id, customer_id, imei,
      device_brand, device_model, warranty_months, start_date, end_date,
      covered_parts, terms, status, claim_status, created_by, created_at
    ) VALUES (
      v_warranty_id, p_tenant_id, p_order_id, v_order.customer_id, v_order.imei,
      v_order.device_brand, v_order.device_model, p_warranty_months,
      v_start, v_end,
      ARRAY['İşçilik', 'Değiştirilen Parçalar'],
      'Servis sonrası garanti', 'aktif', 'yok', p_user_id, v_delivered_at
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'finance_tx_id', v_finance_tx_id,
    'service_fee', p_service_fee,
    'total_expense', v_total_expense,
    'net_profit', v_net_profit,
    'profit_margin', CASE WHEN p_service_fee > 0
      THEN ROUND((v_net_profit / p_service_fee) * 10000) / 100 ELSE 0 END,
    'kasa_balance', v_balance,
    'delivered_at', v_delivered_at,
    'warranty_id', v_warranty_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_service_delivery(
  UUID, UUID, UUID, NUMERIC, TEXT, JSONB, INT, JSONB
) TO service_role;
