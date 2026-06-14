-- ═══════════════════════════════════════════════════════════════════════════════
-- 003: Servis Gider Kalemleri + Kâr Hesabı Alanları
-- ═══════════════════════════════════════════════════════════════════════════════

-- Servis gider kalemleri tablosu
-- Parça eklenince otomatik oluşur, işçilik/kargo manuel eklenir
CREATE TABLE IF NOT EXISTS service_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('part','labor','shipping','other')) NOT NULL,
  reference_id UUID,  -- service_parts_used.id ile bağlantı (parça ise)
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İndeks: servis bazlı hızlı sorgulama
CREATE INDEX IF NOT EXISTS idx_service_expenses_order 
  ON service_expenses(service_order_id);

-- Servis tablosuna kâr hesabı alanları
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_expense DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS net_profit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS financial_posted BOOLEAN DEFAULT false;

-- Finans entri tablosu (servis teslimlerinden gelen gelir/gider)
CREATE TABLE IF NOT EXISTS finance_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type TEXT CHECK (entry_type IN ('income','expense')) NOT NULL,
  service_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  expense_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  posted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_entries_service 
  ON finance_entries(service_id);

-- ─── RLS (Row Level Security) ───────────────────────────────────────────────

ALTER TABLE service_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

-- Tenant isolation — service_expenses üzerinden service_orders.tenant_id'ye bağlanır
CREATE POLICY "tenant_service_expenses" ON service_expenses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM service_orders so 
    WHERE so.id = service_expenses.service_order_id 
    AND so.tenant_id = (SELECT (current_setting('app.tenant_id', true))::uuid)
  )
);

-- Finance entries — doğrudan tenant_id olmadan service üzerinden erişim
CREATE POLICY "tenant_finance_entries" ON finance_entries FOR ALL USING (
  service_id IS NULL OR EXISTS (
    SELECT 1 FROM service_orders so 
    WHERE so.id = finance_entries.service_id 
    AND so.tenant_id = (SELECT (current_setting('app.tenant_id', true))::uuid)
  )
);

-- ─── TRIGGER: Parça eklenince otomatik gider oluştur ─────────────────────────

CREATE OR REPLACE FUNCTION auto_create_part_expense()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_expenses (service_order_id, source, reference_id, description, amount)
  VALUES (
    NEW.service_order_id,
    'part',
    NEW.id,
    COALESCE(NEW.name, 'Parça') || ' (x' || COALESCE(NEW.quantity, 1) || ')',
    COALESCE(NEW.unit_cost, 0) * COALESCE(NEW.quantity, 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_part_expense ON service_parts_used;
CREATE TRIGGER trg_auto_part_expense
  AFTER INSERT ON service_parts_used
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_part_expense();

-- Parça güncellenince gider de güncelle
CREATE OR REPLACE FUNCTION auto_update_part_expense()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_expenses 
  SET amount = COALESCE(NEW.unit_cost, 0) * COALESCE(NEW.quantity, 1),
      description = COALESCE(NEW.name, 'Parça') || ' (x' || COALESCE(NEW.quantity, 1) || ')'
  WHERE reference_id = NEW.id AND source = 'part';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_update_part_expense ON service_parts_used;
CREATE TRIGGER trg_auto_update_part_expense
  AFTER UPDATE ON service_parts_used
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_part_expense();

-- Parça silinince gider de silinsin
CREATE OR REPLACE FUNCTION auto_delete_part_expense()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM service_expenses 
  WHERE reference_id = OLD.id AND source = 'part';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_delete_part_expense ON service_parts_used;
CREATE TRIGGER trg_auto_delete_part_expense
  AFTER DELETE ON service_parts_used
  FOR EACH ROW
  EXECUTE FUNCTION auto_delete_part_expense();
