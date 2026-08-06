-- Sprint 2: SLA (Service Level Agreement) ve Yasal Süre Yönetimi
-- Bu SQL'i Supabase SQL Editor üzerinden çalıştırınız.

CREATE TABLE IF NOT EXISTS sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  category TEXT NOT NULL,
  device_type TEXT,
  standard_days INTEGER NOT NULL DEFAULT 3,
  legal_max_days INTEGER NOT NULL DEFAULT 20,
  warning_at_percent INTEGER NOT NULL DEFAULT 80,
  escalation_roles TEXT[],
  auto_notify_customer BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_configs_tenant ON sla_configs(tenant_id);

CREATE TABLE IF NOT EXISTS sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL REFERENCES service_orders(id),
  event_type TEXT NOT NULL,  -- 'started', 'paused', 'resumed', 'breached', 'completed', 'warning'
  note TEXT,
  triggered_by UUID,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_events_order ON sla_events(order_id);

-- Mevcut servis kayıtlarına "kabul" tarihini başlangıç alarak bir "started" event eklenebilir,
-- ancak geçmiş işlemlerde SLA takibi yapmak yanıltıcı olacağından yeni siparişlerde devreye girmesi daha sağlıklıdır.
