-- Sprint 4: Ticket/CRM Sistemi
-- Bu SQL'i Supabase SQL Editor üzerinden çalıştırınız.

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_no TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'portal';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT;

-- UNIQUE kısıtlamasını mevcut veriler varsa conflict olmaması için NULL olmayanlara uygulayalım:
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_no ON support_tickets(ticket_no) WHERE ticket_no IS NOT NULL;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  sender_type TEXT NOT NULL,         -- 'customer'|'agent'|'system'
  sender_id UUID,                    -- personeli işaret eder
  content TEXT NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  escalated_to UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
