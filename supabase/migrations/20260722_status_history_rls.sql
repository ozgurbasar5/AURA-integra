-- service_status_history — tenant_id RLS + NOT NULL (güvenlik)

-- Eski join-tabanlı politikaları kaldır (varsa)
DROP POLICY IF EXISTS status_history_tenant ON service_status_history;
DROP POLICY IF EXISTS tenant_all_service_status_history ON service_status_history;
DROP POLICY IF EXISTS tenant_select_service_status_history ON service_status_history;
DROP POLICY IF EXISTS tenant_insert_service_status_history ON service_status_history;
DROP POLICY IF EXISTS tenant_update_service_status_history ON service_status_history;
DROP POLICY IF EXISTS tenant_delete_service_status_history ON service_status_history;

-- Kalan NULL tenant_id satırlarını doldur
UPDATE service_status_history ssh
SET tenant_id = so.tenant_id
FROM service_orders so
WHERE ssh.order_id = so.id AND ssh.tenant_id IS NULL;

-- tenant_id zorunlu (yeni kayıtlar için)
ALTER TABLE service_status_history
  ALTER COLUMN tenant_id SET NOT NULL;

-- Doğrudan tenant_id ile RLS
CREATE POLICY status_history_tenant ON service_status_history
  FOR ALL
  USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());
