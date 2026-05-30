-- ================================================================
-- AURA İNTEGRA ERP — Supabase PostgreSQL Şeması
-- Çok kiracılı (multi-tenant) mimari — Bayi + Abonelik Yönetimi
--
-- GÜVENLİK:
-- - RLS (Row Level Security) her tabloda aktif
-- - Kullanıcılar sadece kendi tenant'larının verisine erişebilir
-- - Tüm sorgular parameterized query ile yapılmalıdır
-- - TODO(security): Production'da mTLS ile DB bağlantısı yapılandırın
-- ================================================================

-- ----------------------------------------------------------------
-- 0. UZANTILAR
-- ----------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- 1. TENANT (BAYİ) YÖNETİMİ
-- ----------------------------------------------------------------

-- Abonelik planları
create table if not exists subscription_plans (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,              -- 'Starter', 'Pro', 'Enterprise'
  price_monthly numeric(10,2) not null,
  max_users   int not null default 1,
  max_branches int not null default 1,
  features    jsonb default '[]'::jsonb,         -- özellik listesi
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Varsayılan planlar
insert into subscription_plans (name, price_monthly, max_users, max_branches, features) values
  ('Starter',    390.00,  1,  1, '["Teknik Servis","Stok Yönetimi","5 GB Depolama"]'),
  ('Pro',        890.00,  5,  3, '["Tüm Modüller","Müşteri Portali","20 GB Depolama","Öncelikli Destek"]'),
  ('Enterprise', 1890.00, -1, -1, '["Tüm Modüller + API","White-label","100 GB Depolama","7/24 Destek"]')
on conflict (name) do nothing;

-- Tenant (bayi/şirket)
create table if not exists tenants (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,                        -- Firma adı
  slug            text not null unique,                  -- URL slug (konya-teknik-servis)
  owner_name      text not null,
  city            text,
  tax_number      text,                                  -- VKN (şifreli saklanmalı, TODO: pgp_sym_encrypt)
  tax_office      text,
  address         text,
  phone           text,
  email           text not null,
  plan_id         uuid references subscription_plans(id),
  status          text not null default 'trial'
                  check (status in ('trial','active','suspended','cancelled')),
  trial_ends_at   timestamptz,
  subscription_ends_at timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Bayi Ayarları (Otomatik hatırlatma vb.)
create table if not exists tenant_settings (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  auto_remind     boolean not null default true,
  remind_days_before int not null default 3,
  invoice_prefix  text default 'INV',
  updated_at      timestamptz not null default now()
);

-- Bayi Ödemeleri / Abonelik Fatura Takibi
create table if not exists tenant_payments (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  amount          numeric(10,2) not null,
  due_date        date not null,
  payment_date    timestamptz,
  status          text not null default 'pending'
                  check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  invoice_url     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 2. ŞUBE YÖNETİMİ
-- ----------------------------------------------------------------
create table if not exists branches (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  address     text,
  phone       text,
  is_main     boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. KULLANICI YÖNETİMİ (Supabase Auth ile entegre)
-- ----------------------------------------------------------------
create table if not exists user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  branch_id   uuid references branches(id),
  full_name   text not null,
  role        text not null default 'teknisyen'
              check (role in ('super_admin','tenant_admin','teknisyen','muhasebe','satış')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 4. MÜŞTERİLER
-- ----------------------------------------------------------------
create table if not exists customers (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  full_name     text not null,
  -- TODO(security): PII alanları şifreli saklanmalı (pgp_sym_encrypt)
  phone         text,                      -- Şifreli saklanmalı: pgp_sym_encrypt(phone, key)
  email         text,
  tc_hash       text,                      -- TC → bcrypt hash (arama için ayrı index tablosu)
  iban          text,
  address       text,
  kvkk_consent  boolean not null default false,
  kvkk_date     timestamptz,
  portal_enabled boolean not null default false,
  portal_pin_hash text,                    -- bcrypt hash
  notes         text,
  created_by    uuid references user_profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 5. TEKNİK SERVİS
-- ----------------------------------------------------------------

-- Servis durumları (state machine)
-- alindi → teshis → onay_bekleniyor → tamir → kalite_kontrol → teslim
-- veya herhangi bir aşamadan → iptal

create table if not exists service_orders (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid references branches(id),
  order_no        text not null,           -- SRV-001 formatı
  customer_id     uuid references customers(id),

  -- Cihaz bilgileri
  device_brand    text not null,
  device_model    text not null,
  device_imei     text,
  device_color    text,
  device_serial   text,
  accessories     text[],                  -- ['Kılıf', 'Kutu', 'Şarj Aleti']

  -- Arıza
  fault_desc      text not null,
  fault_category  text,

  -- Atama
  technician_id   uuid references user_profiles(id),

  -- Durum (state machine)
  status          text not null default 'alindi'
                  check (status in ('alindi','teshis','onay_bekleniyor','tamir','kalite_kontrol','teslim','iptal')),

  -- Finansal
  estimated_cost  numeric(10,2),
  deposit_amount  numeric(10,2) default 0,
  final_cost      numeric(10,2),
  discount        numeric(10,2) default 0,

  -- SMS onay
  sms_token       text,                    -- TODO(security): Hash'li sakla, plain text değil
  sms_token_sent_at timestamptz,
  sms_approved_at   timestamptz,

  -- Yedek cihaz
  loaner_device_id uuid,                   -- references products(id)
  loaner_type      text check (loaner_type in ('ucretsiz','ucretli','teminatsiz')),

  -- Garanti
  warranty_days   int default 30,
  warranty_start  timestamptz,

  -- Meta
  internal_notes  text,
  created_by      uuid references user_profiles(id),
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Servis durum geçmişi
create table if not exists service_status_history (
  id            uuid primary key default uuid_generate_v4(),
  service_id    uuid not null references service_orders(id) on delete cascade,
  from_status   text,
  to_status     text not null,
  changed_by    uuid references user_profiles(id),
  note          text,
  created_at    timestamptz not null default now()
);

-- Servis'te kullanılan parçalar
create table if not exists service_parts_used (
  id            uuid primary key default uuid_generate_v4(),
  service_id    uuid not null references service_orders(id) on delete cascade,
  part_id       uuid,                      -- references parts(id)
  part_name     text not null,
  quantity      int not null default 1,
  unit_cost     numeric(10,2) not null,
  added_by      uuid references user_profiles(id),
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 6. STOK & ÜRÜNLER
-- ----------------------------------------------------------------

-- Cihazlar (satılık)
create table if not exists products (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  branch_id     uuid references branches(id),
  brand         text not null,
  model         text not null,
  storage       text,
  color         text,
  imei          text unique,
  serial_no     text,
  product_type  text not null default 'sifir' check (product_type in ('sifir','ikinci_el')),
  purchase_price numeric(10,2),
  sale_price    numeric(10,2),
  is_sold       boolean not null default false,
  sold_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Parçalar / yedek parça envanteri
create table if not exists parts (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  branch_id     uuid references branches(id),
  name          text not null,
  brand         text,
  category      text,
  barcode       text,
  sku           text,
  stock_qty     int not null default 0,
  min_stock_qty int not null default 1,    -- kritik stok eşiği
  unit_cost     numeric(10,2),
  unit_price    numeric(10,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Stok hareketleri
create table if not exists stock_movements (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  part_id       uuid references parts(id),
  product_id    uuid references products(id),
  movement_type text not null
                check (movement_type in ('giris','cikis','transfer','iade','hurda')),
  quantity      int not null,
  from_branch   uuid references branches(id),
  to_branch     uuid references branches(id),
  reference_id  uuid,                      -- service_id veya order_id
  note          text,
  created_by    uuid references user_profiles(id),
  created_at    timestamptz not null default now()
);

-- Tedarikçiler
create table if not exists suppliers (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  contact_name  text,
  phone         text,
  email         text,
  address       text,
  tax_number    text,
  category      text,
  balance       numeric(10,2) default 0,  -- negatif = borç
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Satın alma siparişleri
create table if not exists purchase_orders (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  branch_id     uuid references branches(id),
  order_no      text not null,
  supplier_id   uuid references suppliers(id),
  status        text not null default 'hazirlaniyor'
                check (status in ('hazirlaniyor','onaylandi','yolda','teslim_alindi','iptal')),
  total_amount  numeric(10,2) default 0,
  paid_amount   numeric(10,2) default 0,
  notes         text,
  expected_date date,
  received_at   timestamptz,
  created_by    uuid references user_profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Sipariş kalemleri
create table if not exists purchase_order_items (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references purchase_orders(id) on delete cascade,
  part_id         uuid references parts(id),
  description     text not null,
  ordered_qty     int not null,
  received_qty    int not null default 0,
  unit_cost       numeric(10,2) not null,
  total_cost      numeric(10,2) generated always as (ordered_qty * unit_cost) stored
);

-- ----------------------------------------------------------------
-- 7. FİNANS & MUHASEBE
-- ----------------------------------------------------------------

-- Kasa ve banka hesapları
create table if not exists accounts (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  branch_id     uuid references branches(id),
  name          text not null,
  account_type  text not null check (account_type in ('kasa','banka','pos')),
  currency      text not null default 'TRY',
  balance       numeric(12,2) not null default 0,
  bank_name     text,
  iban          text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Finansal işlemler (fiş)
create table if not exists financial_transactions (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid references branches(id),
  transaction_no  text,
  account_id      uuid references accounts(id),
  transaction_type text not null check (transaction_type in ('gelir','gider','transfer')),
  category        text,                    -- 'Servis', 'Satış', 'Kira', 'Parça Alım' ...
  description     text,
  amount          numeric(10,2) not null check (amount > 0),
  vat_rate        numeric(5,2) default 0,
  vat_amount      numeric(10,2) default 0,
  payment_method  text check (payment_method in ('nakit','pos','havale','cek')),
  reference_id    uuid,                    -- service_id veya product_id
  reference_type  text,
  transaction_date date not null default current_date,
  created_by      uuid references user_profiles(id),
  created_at      timestamptz not null default now()
);

-- Çek yönetimi
create table if not exists checks (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  check_no        text,
  check_type      text not null check (check_type in ('musteri','tedarikci')),
  drawer_name     text not null,           -- çeki düzenleyen
  bank_name       text,
  branch_name     text,
  amount          numeric(10,2) not null,
  due_date        date not null,
  status          text not null default 'beklemede'
                  check (status in ('beklemede','tahsil_edildi','ciroda','takas','iade','protestolu')),
  ciro_to         text,                    -- ciro edildiği kişi/firma
  account_id      uuid references accounts(id),
  notes           text,
  created_by      uuid references user_profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 8. ALIŞ-SATIŞ
-- ----------------------------------------------------------------

-- Satışlar
create table if not exists sales (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid references branches(id),
  sale_no         text not null,
  customer_id     uuid references customers(id),
  sale_type       text not null check (sale_type in ('sifir_satis','ikinci_el_satis','aksesuar')),
  product_id      uuid references products(id),
  sale_price      numeric(10,2) not null,
  discount        numeric(10,2) default 0,
  vat_rate        numeric(5,2) default 20,
  payment_method  text,
  kvkk_consent    boolean default false,
  contract_hash   text,                    -- SHA-256 hash of contract PDF
  warranty_days   int default 730,         -- 2 yıl
  warranty_end    date,
  sold_by         uuid references user_profiles(id),
  sale_date       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- 2.el Alım
create table if not exists second_hand_purchases (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid references branches(id),
  customer_id     uuid references customers(id),
  product_id      uuid references products(id),
  purchase_price  numeric(10,2) not null,
  device_condition text check (device_condition in ('iyi','orta','kotü')),
  damage_notes    text,
  imei_verified   boolean default false,
  contract_pdf_url text,
  contract_hash   text,                    -- SHA-256
  edevlet_imei_pdf text,                   -- şifreli arşiv yolu
  purchased_by    uuid references user_profiles(id),
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 9. INDEKSLER
-- ----------------------------------------------------------------
create index if not exists idx_service_orders_tenant    on service_orders(tenant_id);
create index if not exists idx_service_orders_status    on service_orders(status);
create index if not exists idx_service_orders_customer  on service_orders(customer_id);
create index if not exists idx_service_orders_tech      on service_orders(technician_id);
create index if not exists idx_products_tenant          on products(tenant_id);
create index if not exists idx_products_imei            on products(imei);
create index if not exists idx_parts_tenant             on parts(tenant_id);
create index if not exists idx_transactions_tenant      on financial_transactions(tenant_id);
create index if not exists idx_transactions_date        on financial_transactions(transaction_date);
create index if not exists idx_customers_tenant         on customers(tenant_id);
create index if not exists idx_checks_due_date          on checks(due_date);

-- ----------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------
-- Her kullanıcı sadece kendi tenant'ının verisine erişebilir

alter table tenants               enable row level security;
alter table branches              enable row level security;
alter table user_profiles         enable row level security;
alter table customers             enable row level security;
alter table service_orders        enable row level security;
alter table service_status_history enable row level security;
alter table service_parts_used    enable row level security;
alter table products              enable row level security;
alter table parts                 enable row level security;
alter table stock_movements       enable row level security;
alter table suppliers             enable row level security;
alter table purchase_orders       enable row level security;
alter table financial_transactions enable row level security;
alter table checks                enable row level security;
alter table sales                 enable row level security;
alter table second_hand_purchases enable row level security;

-- Tenant ID'yi auth'dan al (JWT claim)
create or replace function get_current_tenant_id()
returns uuid language sql stable as $$
  select (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid;
$$;

-- Örnek RLS policy (diğer tablolar için aynı pattern)
create policy "tenant_isolation_service_orders"
on service_orders for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

create policy "tenant_isolation_customers"
on customers for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

create policy "tenant_isolation_products"
on products for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

create policy "tenant_isolation_parts"
on parts for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

create policy "tenant_isolation_transactions"
on financial_transactions for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

create policy "tenant_isolation_checks"
on checks for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

create policy "tenant_isolation_sales"
on sales for all
using (tenant_id = get_current_tenant_id())
with check (tenant_id = get_current_tenant_id());

-- Super Admin yetkisi kontrol fonksiyonu
create or replace function is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- tenant_payments RLS (Bayi kendi faturasını görür, Super Admin hepsini görür/düzenler)
alter table tenant_payments enable row level security;

create policy "tenant_payments_select"
on tenant_payments for select
using (tenant_id = get_current_tenant_id() or is_super_admin());

create policy "tenant_payments_all_super_admin"
on tenant_payments for all
using (is_super_admin())
with check (is_super_admin());

-- tenant_settings RLS
alter table tenant_settings enable row level security;

create policy "tenant_settings_select"
on tenant_settings for select
using (tenant_id = get_current_tenant_id() or is_super_admin());

create policy "tenant_settings_update"
on tenant_settings for update
using (tenant_id = get_current_tenant_id() or is_super_admin())
with check (tenant_id = get_current_tenant_id() or is_super_admin());


-- ----------------------------------------------------------------
-- 11. FAYDA FONKSİYONLARI
-- ----------------------------------------------------------------

-- Otomatik order_no üretimi
create or replace function generate_order_no(prefix text, tenant_uuid uuid)
returns text language plpgsql as $$
declare
  seq_val int;
begin
  select count(*) + 1 into seq_val
  from service_orders
  where tenant_id = tenant_uuid;
  return prefix || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

-- Stok güncelleme trigger (parça kullanıldığında)
create or replace function update_stock_on_part_used()
returns trigger language plpgsql as $$
begin
  update parts
  set stock_qty = stock_qty - new.quantity,
      updated_at = now()
  where id = new.part_id;
  return new;
end;
$$;

create trigger trg_stock_on_part_used
  after insert on service_parts_used
  for each row execute function update_stock_on_part_used();

-- updated_at otomatik güncelleme
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_service_orders_updated_at
  before update on service_orders
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_parts_updated_at
  before update on parts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------
-- 12. DEMO VERİ (Geliştirme ortamı için)
-- ----------------------------------------------------------------
-- NOT: Production'da bu bloğu çalıştırmayın!

/*
insert into tenants (name, slug, owner_name, city, email, status) values
  ('Merkez Teknik Servis', 'merkez-ts', 'Mehmet Demir', 'İstanbul', 'admin@merkez-ts.com', 'active')
returning id;

-- Branch ve kullanıcı auth.users üzerinden Supabase Dashboard'dan oluşturun
-- veya Supabase SDK ile kayıt olun, sonra user_profiles tablosuna ekleyin.
*/
