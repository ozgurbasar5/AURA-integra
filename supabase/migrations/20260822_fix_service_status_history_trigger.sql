-- ============================================================================
-- Migration: Fix service_status_history trigger tenant_id NOT NULL constraint
-- ============================================================================

CREATE OR REPLACE FUNCTION log_service_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO service_status_history (order_id, tenant_id, status, note, created_by)
    VALUES (NEW.id, NEW.tenant_id, NEW.status, 'Otomatik durum değişikliği', COALESCE(auth.uid(), NEW.created_by));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_status_log ON service_orders;
CREATE TRIGGER trg_service_status_log
AFTER UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION log_service_status_change();
