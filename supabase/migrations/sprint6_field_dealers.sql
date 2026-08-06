-- Sprint 6: Saha Servis & Bayi Modülü (B2B)
-- Bu SQL'i Supabase SQL Editor üzerinden çalıştırınız.

-- 1. Saha Servis Yönetimi
CREATE TABLE IF NOT EXISTS field_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  parent_order_id UUID REFERENCES service_orders(id),
  customer_id UUID,
  technician_id UUID,
  address TEXT NOT NULL,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  scheduled_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- 'scheduled'|'en_route'|'in_progress'|'completed'|'cancelled'
  customer_signature TEXT,         -- base64 SVG
  photos JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_field_orders_tenant ON field_orders(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_field_orders_tech ON field_orders(technician_id, scheduled_at);

-- 2. Bayiler (B2B)
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  tax_no TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending'|'active'|'suspended'
  discount_rate NUMERIC(5,2) DEFAULT 0,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,  -- ödeme vadesi (gün)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealers_tenant ON dealers(tenant_id, created_at);

-- 3. Bayi Siparişleri (Toptan Yedek Parça vb.)
CREATE TABLE IF NOT EXISTS dealer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id),
  tenant_id UUID NOT NULL,
  order_no TEXT UNIQUE,
  items JSONB NOT NULL,
  subtotal NUMERIC(12,2),
  discount_amount NUMERIC(12,2),
  vat_amount NUMERIC(12,2),
  total NUMERIC(12,2),
  status TEXT DEFAULT 'draft', -- 'draft'|'confirmed'|'shipped'|'delivered'|'cancelled'
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealer_orders_tenant ON dealer_orders(tenant_id, created_at);

-- 4. Bayi Faturaları / Cari Haraketleri
CREATE TABLE IF NOT EXISTS dealer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id),
  order_id UUID REFERENCES dealer_orders(id),
  tenant_id UUID NOT NULL,
  invoice_no TEXT UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT DEFAULT 'invoice', -- 'invoice' (borç) | 'payment' (alacak)
  due_date DATE,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending'|'paid'|'overdue'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealer_invoices_dealer ON dealer_invoices(dealer_id, due_date);
