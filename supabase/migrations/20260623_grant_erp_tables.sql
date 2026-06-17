-- ============================================================================
-- ERP tabloları — PostgREST erişim izinleri (42501 permission denied düzeltmesi)
-- SQL Editor'da çalıştırın; ardından: npm run check:tables
-- ============================================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenant_settings',
    'appointments',
    'warranties',
    'invoices',
    'notification_logs',
    'support_tickets',
    'cash_shifts',
    'supplier_orders',
    'showcase_devices',
    'foreign_devices',
    'service_expenses',
    'personnel_profiles',
    'bayi_basvurulari'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('GRANT ALL ON TABLE %I TO authenticated', tbl);
      EXECUTE format('GRANT ALL ON TABLE %I TO service_role', tbl);
      EXECUTE format('GRANT SELECT, INSERT ON TABLE %I TO anon', tbl);
    END IF;
  END LOOP;
END $$;

-- Yeni kayıtlar için varsayılan izinler (ileride eklenen tablolar)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Doğrulama (postgres rolü — service_role PostgREST üzerinden test edilir)
SELECT tablename,
       has_table_privilege('authenticated', quote_ident(tablename), 'SELECT') AS auth_select,
       has_table_privilege('service_role', quote_ident(tablename), 'SELECT') AS svc_select
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('showcase_devices', 'service_expenses', 'appointments', 'tenant_settings')
ORDER BY tablename;
