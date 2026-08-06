-- Sprint 3: Dinamik Checklist ve IMEI Matrix History
-- Bu SQL'i Supabase SQL Editor üzerinden çalıştırınız.

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  device_type TEXT,
  brand_filter TEXT[],    -- null ise tüm markalara uygulanır
  items JSONB NOT NULL,   -- [{id, label, required, hint, photo_required}]
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_tenant ON checklist_templates(tenant_id);

CREATE TABLE IF NOT EXISTS checklist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL REFERENCES service_orders(id),
  template_id UUID REFERENCES checklist_templates(id),
  phase TEXT NOT NULL,   -- 'pre_check' | 'qc' | 'delivery'
  answers JSONB NOT NULL, -- [{item_id, checked, note, photo_url}]
  completed_by UUID,      -- personeli işaret edebilir (foreign key eklenebilir duruma göre)
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_results_order ON checklist_results(order_id);

CREATE TABLE IF NOT EXISTS imei_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  imei TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'service', 'sale', 'warranty', 'stolen_check', 'purchase'
  event_id UUID,             -- ilgili kayıt ID'si (örneğin sipariş ID'si veya garanti ID'si)
  customer_name TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imei_history_tenant_imei ON imei_history(tenant_id, imei, created_at DESC);
