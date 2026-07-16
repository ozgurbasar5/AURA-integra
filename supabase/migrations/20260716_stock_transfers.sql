-- Şubeler arası stok transferi + şube bazlı stok dağılımı
CREATE TABLE IF NOT EXISTS branch_part_stock (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  part_id    UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  qty        INT NOT NULL DEFAULT 0 CHECK (qty >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id, part_id)
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES branches(id),
  to_branch_id   UUID NOT NULL REFERENCES branches(id),
  part_id        UUID NOT NULL REFERENCES parts(id),
  qty            INT NOT NULL CHECK (qty > 0),
  note           TEXT,
  created_by     UUID REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON stock_transfers(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_part_stock_lookup ON branch_part_stock(tenant_id, branch_id, part_id);

-- RLS
ALTER TABLE branch_part_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_all_branch_part_stock ON branch_part_stock;
CREATE POLICY tenant_all_branch_part_stock ON branch_part_stock
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

DROP POLICY IF EXISTS tenant_all_stock_transfers ON stock_transfers;
CREATE POLICY tenant_all_stock_transfers ON stock_transfers
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

GRANT ALL ON TABLE branch_part_stock TO authenticated, service_role;
GRANT ALL ON TABLE stock_transfers TO authenticated, service_role;
