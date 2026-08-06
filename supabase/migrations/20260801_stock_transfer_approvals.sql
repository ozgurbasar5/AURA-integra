-- Şubeler arası stok transfer onay mekanizması ve durum takibi
ALTER TABLE stock_transfers 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'in_transit', 'received', 'rejected')),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id);

-- Transfer onaylama ve stok güncelleme atomik fonksiyonu
CREATE OR REPLACE FUNCTION process_stock_transfer(
  p_transfer_id UUID,
  p_status VARCHAR(20),
  p_approved_by UUID
) RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  
  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transfer kaydı bulunamadı.';
  END IF;

  IF p_status = 'received' AND v_transfer.status != 'received' THEN
    -- Çıkış şubesinden stok düş
    INSERT INTO branch_part_stock (tenant_id, branch_id, part_id, qty)
    VALUES (v_transfer.tenant_id, v_transfer.from_branch_id, v_transfer.part_id, 0)
    ON CONFLICT (tenant_id, branch_id, part_id) DO NOTHING;
    
    UPDATE branch_part_stock 
    SET qty = GREATEST(0, qty - v_transfer.qty), updated_at = NOW()
    WHERE tenant_id = v_transfer.tenant_id 
      AND branch_id = v_transfer.from_branch_id 
      AND part_id = v_transfer.part_id;

    -- Hedef şubeye stok ekle
    INSERT INTO branch_part_stock (tenant_id, branch_id, part_id, qty)
    VALUES (v_transfer.tenant_id, v_transfer.to_branch_id, v_transfer.part_id, v_transfer.qty)
    ON CONFLICT (tenant_id, branch_id, part_id) 
    DO UPDATE SET qty = branch_part_stock.qty + EXCLUDED.qty, updated_at = NOW();

    -- Status güncelle
    UPDATE stock_transfers 
    SET status = 'received', received_at = NOW(), approved_by = p_approved_by
    WHERE id = p_transfer_id;

  ELSIF p_status = 'rejected' THEN
    UPDATE stock_transfers 
    SET status = 'rejected', approved_by = p_approved_by
    WHERE id = p_transfer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
