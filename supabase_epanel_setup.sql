-- ====================================================================
-- AURA İNTEGRA ERP — SUPABASE VERİTABANI KURULUM BETİĞİ (DDL)
-- ====================================================================
-- Bu SQL dosyasını Supabase Dashboard -> SQL Editor kısmında çalıştırın.
-- Bu betik, E-Panel ve Bayi Portalı'nın çalışması için gereken tüm
-- tabloları, görünümleri (views), indeksleri ve RLS politikalarını kurar.
-- ====================================================================

-- UZANTILAR
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. FİRMA KAYNAKLARI (Markalar / Bayiler)
CREATE TABLE IF NOT EXISTS ayarlar_kaynaklar (
    id BIGSERIAL PRIMARY KEY,
    isim TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERSONEL VE YETKİLERİ
CREATE TABLE IF NOT EXISTS personel_izinleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    ad_soyad TEXT,
    rol TEXT DEFAULT 'stajyer', -- admin, teknisyen, satis, depocu, stajyer
    durum TEXT DEFAULT 'aktif', -- aktif, pasif
    yetkiler TEXT[] DEFAULT '{}',
    telefon TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TEKNİSYENLER (Personel İzinleri Üzerinden View)
CREATE OR REPLACE VIEW teknisyenler AS
SELECT id, ad_soyad, rol, durum, email, telefon, avatar_url, created_at
FROM personel_izinleri
WHERE rol IN ('teknisyen', 'admin') AND durum = 'aktif';

-- 4. TEKNİK SERVİS ARIZA KAYITLARI (AURA JOBS)
CREATE TABLE IF NOT EXISTS aura_jobs (
    id BIGSERIAL PRIMARY KEY,
    customer TEXT NOT NULL,
    customer_email TEXT,
    customer_type TEXT DEFAULT 'Son Kullanıcı', -- Son Kullanıcı, Bayi
    email TEXT,
    phone TEXT,
    address TEXT,
    device TEXT NOT NULL,
    category TEXT DEFAULT 'Cep Telefonu',
    brand TEXT,
    model TEXT,
    serial_no TEXT,
    password TEXT,
    issue TEXT,
    problem TEXT,
    technician_note TEXT,
    private_note TEXT,
    status TEXT DEFAULT 'Bekliyor',
    price TEXT DEFAULT '0',
    cost NUMERIC DEFAULT 0,
    tracking_code TEXT UNIQUE NOT NULL,
    payment_status TEXT DEFAULT 'unpaid',
    accessories TEXT DEFAULT '[]',
    pre_checks TEXT DEFAULT '[]',
    final_checks TEXT DEFAULT '[]',
    images JSONB DEFAULT '[]'::JSONB,
    recommended_upsells JSONB DEFAULT '[]'::JSONB,
    sold_upsells JSONB DEFAULT '[]'::JSONB,
    tip_id TEXT DEFAULT 'genel',
    approval_status TEXT DEFAULT 'none',
    approval_amount TEXT DEFAULT '0',
    approval_desc TEXT,
    process_details JSONB DEFAULT '[]'::JSONB,
    discount_amount NUMERIC DEFAULT 0,
    original_price NUMERIC DEFAULT 0,
    parca_ucreti NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- KVKK Alanları
    kvkk_riza BOOLEAN DEFAULT FALSE,
    kvkk_tarihi TIMESTAMPTZ,
    acik_riza_pazarlama BOOLEAN DEFAULT FALSE,
    acik_riza_whatsapp BOOLEAN DEFAULT FALSE,
    kvkk_version VARCHAR(20) DEFAULT '2025-v1'
);

-- 5. KASA GELİR/GİDER HAREKETLERİ (AURA FİNANS)
CREATE TABLE IF NOT EXISTS aura_finans (
    id BIGSERIAL PRIMARY KEY,
    tur TEXT NOT NULL, -- Gelir, Gider
    baslik TEXT NOT NULL,
    tutar NUMERIC(12,2) NOT NULL DEFAULT 0,
    kategori TEXT DEFAULT 'Genel Gider',
    odeme_yontemi TEXT DEFAULT 'Nakit',
    tarih TIMESTAMPTZ DEFAULT NOW(),
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STOK KARTLARI VE ENVANTER (AURA STOK)
CREATE TABLE IF NOT EXISTS aura_stok (
    id BIGSERIAL PRIMARY KEY,
    urun_adi TEXT NOT NULL,
    stok_kodu TEXT UNIQUE,
    kategori TEXT,
    tedarikci TEXT,
    alis_fiyati NUMERIC(12,2) DEFAULT 0,
    satis_fiyati NUMERIC(12,2) DEFAULT 0,
    stok_adedi INT DEFAULT 0,
    alis_tarihi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STOK HAREKETLERİ (GİRİŞ/ÇIKIŞ LOGLARI)
CREATE TABLE IF NOT EXISTS aura_stok_hareketleri (
    id BIGSERIAL PRIMARY KEY,
    stok_id BIGINT REFERENCES aura_stok(id) ON DELETE SET NULL,
    stok_kodu TEXT,
    urun_adi TEXT NOT NULL,
    hareket_tipi TEXT NOT NULL, -- Depoya Giriş, Servis Sarf Çıkışı, Satış Çıkışı, İade Girişi vb.
    miktar INT NOT NULL DEFAULT 0,
    net_miktar INT NOT NULL DEFAULT 0,
    birim_fiyat NUMERIC(12,2) DEFAULT 0,
    toplam_tutar NUMERIC(12,2) DEFAULT 0,
    tedarikci TEXT,
    kayit_tarihi TIMESTAMPTZ DEFAULT NOW(),
    olusturan TEXT,
    aciklama TEXT,
    referans_id BIGINT,
    referans_tip TEXT
);

-- 8. SERVİSTE KULLANILAN YEDEK PARÇALAR
CREATE TABLE IF NOT EXISTS aura_servis_parcalari (
    id BIGSERIAL PRIMARY KEY,
    job_id TEXT, -- aura_jobs primary key references or text tracking code
    stok_id BIGINT REFERENCES aura_stok(id) ON DELETE SET NULL,
    adet INT DEFAULT 1,
    alis_fiyati_anlik NUMERIC(12,2) DEFAULT 0,
    satis_fiyati_anlik NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SERVİS ZAMAN ÇİZELGESİ (TIMELINE LOGS)
CREATE TABLE IF NOT EXISTS aura_timeline (
    id BIGSERIAL PRIMARY KEY,
    job_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BAYİ BAŞVURULARI VE HESAPLARI
CREATE TABLE IF NOT EXISTS bayi_basvurulari (
    id BIGSERIAL PRIMARY KEY,
    sirket_adi TEXT NOT NULL,
    yetkili_kisi TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefon TEXT NOT NULL,
    notlar TEXT,
    sektorler TEXT[],
    password TEXT,
    durum TEXT DEFAULT 'Bekliyor', -- Bekliyor, Onaylandı, Reddedildi
    vergi_no TEXT,
    adres TEXT,
    subscription_plan TEXT DEFAULT 'Standart', -- Standart, Gold, Platinum
    satis_temsilcisi TEXT,
    satis_temsilcisi_tel TEXT,
    satis_temsilcisi_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. WEB SİTESİ ONARIM TALEPLERİ
CREATE TABLE IF NOT EXISTS onarim_talepleri (
    id BIGSERIAL PRIMARY KEY,
    ad_soyad TEXT NOT NULL,
    telefon TEXT NOT NULL,
    cihaz_tipi TEXT NOT NULL,
    marka_model TEXT NOT NULL,
    sorun_aciklamasi TEXT,
    teslimat_yontemi TEXT DEFAULT 'sube', -- sube, kurye
    adres TEXT,
    durum TEXT DEFAULT 'beklemede',
    kvkk_riza BOOLEAN DEFAULT FALSE,
    kvkk_tarihi TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. MOTO-KURYE TALEPLERİ
CREATE TABLE IF NOT EXISTS aura_courier (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    device TEXT NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'Bekliyor', -- Bekliyor, Yönlendirildi, Teslim Alındı, Tamamlandı
    basvuru_id BIGINT REFERENCES onarim_talepleri(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. HIZLI PERAKENDE SATIŞ GEÇMİŞİ
CREATE TABLE IF NOT EXISTS satis_gecmisi (
    id BIGSERIAL PRIMARY KEY,
    musteri TEXT DEFAULT 'Misafir Müşteri',
    urunler TEXT,
    tutar NUMERIC(12,2) NOT NULL DEFAULT 0,
    odeme_yontemi TEXT DEFAULT 'Nakit',
    durum TEXT DEFAULT 'Tamamlandı',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. VİTRİN CİHAZLARI (SATILIK CİHAZ STOĞU)
CREATE TABLE IF NOT EXISTS aura_vitrin_cihazlari (
    id BIGSERIAL PRIMARY KEY,
    kategori TEXT NOT NULL DEFAULT 'Telefon',
    marka_model TEXT NOT NULL,
    imei_seri_no TEXT,
    durum TEXT NOT NULL DEFAULT 'Vitrinde', -- Vitrinde, Satıldı, Rezerve
    maliyet NUMERIC(12,2) NOT NULL DEFAULT 0,
    satis_fiyati NUMERIC(12,2) NOT NULL DEFAULT 0,
    tedarikci TEXT,
    musteri TEXT,
    ekspertiz_notu TEXT,
    resim_url TEXT,
    odeme_yontemi_alis TEXT DEFAULT 'Nakit',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    satilma_tarihi TIMESTAMPTZ
);

-- 15. EK SATIŞ / FIRSAT ÜRÜNLERİ (UPSELL OPTIONS)
CREATE TABLE IF NOT EXISTS aura_upsell_products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    category TEXT,
    type TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. BAYİ CARİ ÖDEMELERİ / TAHSİLATLAR
CREATE TABLE IF NOT EXISTS aura_payments (
    id BIGSERIAL PRIMARY KEY,
    dealer_id TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. TEKNİSYEN ARIZA KÜTÜPHANESİ (WIKI)
CREATE TABLE IF NOT EXISTS aura_wiki (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    device_category TEXT,
    problem_desc TEXT,
    solution_steps TEXT,
    author TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. AURA STORE PERAKENDE ÜRÜNLER
CREATE TABLE IF NOT EXISTS urunler (
    id BIGSERIAL PRIMARY KEY,
    ad TEXT NOT NULL,
    fiyat NUMERIC(12,2) NOT NULL DEFAULT 0,
    kategori TEXT,
    resim_url TEXT,
    aciklama TEXT,
    stok_durumu BOOLEAN DEFAULT TRUE, -- true = Satışta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. AURA STORE SATIŞ GEÇMİŞİ
CREATE TABLE IF NOT EXISTS aura_store_sales (
    id BIGSERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    customer_name TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Tamamlandı',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. GENEL DESTEK TALEPLERİ
CREATE TABLE IF NOT EXISTS destek_talepleri (
    id BIGSERIAL PRIMARY KEY,
    ad_soyad TEXT NOT NULL,
    telefon TEXT,
    email TEXT,
    konu TEXT,
    mesaj TEXT,
    durum TEXT DEFAULT 'Bekliyor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. BAYİ DESTEK TALEPLERİ
CREATE TABLE IF NOT EXISTS bayi_destek (
    id BIGSERIAL PRIMARY KEY,
    bayi_id BIGINT REFERENCES bayi_basvurulari(id) ON DELETE CASCADE,
    bayi_adi TEXT,
    konu TEXT,
    mesaj TEXT,
    durum TEXT DEFAULT 'İnceleniyor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. ONLİNE FORM KAYITLARI
CREATE TABLE IF NOT EXISTS aura_online_forms (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'Okunmadı',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. MÜŞTERİ MEMNUNİYET DEĞERLENDİRMELERİ
CREATE TABLE IF NOT EXISTS aura_reviews (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. KVKK ONAY LOG TABLOSU
CREATE TABLE IF NOT EXISTS aura_kvkk_log (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT REFERENCES aura_jobs(id) ON DELETE SET NULL,
    musteri_adi TEXT NOT NULL,
    musteri_email TEXT,
    musteri_tel TEXT,
    kvkk_riza BOOLEAN NOT NULL DEFAULT FALSE,
    acik_riza_pazarlama BOOLEAN DEFAULT FALSE,
    acik_riza_whatsapp BOOLEAN DEFAULT FALSE,
    kvkk_version VARCHAR(20) DEFAULT '2025-v1',
    onay_tarihi TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- 25. KVKK TALEPLERİ
CREATE TABLE IF NOT EXISTS aura_kvkk_talepler (
    id BIGSERIAL PRIMARY KEY,
    musteri_adi TEXT NOT NULL,
    musteri_email TEXT,
    musteri_tel TEXT,
    talep_turu TEXT NOT NULL CHECK (talep_turu IN ('silme', 'duzeltme', 'ihrac', 'itiraz')),
    talep_aciklama TEXT,
    durum TEXT NOT NULL DEFAULT 'Bekliyor' CHECK (durum IN ('Bekliyor', 'İşlemde', 'Tamamlandı', 'Reddedildi')),
    islem_notu TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tamamlanan_at TIMESTAMPTZ,
    ilgili_job_ids BIGINT[],
    sorumlu_personel TEXT
);

-- 26. CİHAZ EKSPERTİZ RAPORLARI
CREATE TABLE IF NOT EXISTS aura_expertise_reports (
    id BIGSERIAL PRIMARY KEY,
    category TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_no TEXT NOT NULL,
    customer_name TEXT,
    service_price NUMERIC(12,2),
    device_origin TEXT DEFAULT 'TR',
    score INT,
    answers JSONB DEFAULT '{}'::JSONB,
    technician_note TEXT,
    technician_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. EKSPERTİZ KOLAY EŞLEŞTİRME (View)
CREATE OR REPLACE VIEW aura_expertise AS
SELECT id, serial_no
FROM aura_expertise_reports;

-- ====================================================================
-- İNDEKSLER (Performans Optimizasyonları)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_aura_jobs_tracking ON aura_jobs(tracking_code);
CREATE INDEX IF NOT EXISTS idx_aura_jobs_status ON aura_jobs(status);
CREATE INDEX IF NOT EXISTS idx_aura_jobs_customer ON aura_jobs(customer);
CREATE INDEX IF NOT EXISTS idx_aura_stok_kodu ON aura_stok(stok_kodu);
CREATE INDEX IF NOT EXISTS idx_stok_hareket_stok_id ON aura_stok_hareketleri(stok_id);
CREATE INDEX IF NOT EXISTS idx_servis_parcalari_job_id ON aura_servis_parcalari(job_id);
CREATE INDEX IF NOT EXISTS idx_timeline_job_id ON aura_timeline(job_id);
CREATE INDEX IF NOT EXISTS idx_bayi_basvurulari_email ON bayi_basvurulari(email);
CREATE INDEX IF NOT EXISTS idx_bayi_destek_bayi_id ON bayi_destek(bayi_id);
CREATE INDEX IF NOT EXISTS idx_kvkk_log_job_id ON aura_kvkk_log(job_id);
CREATE INDEX IF NOT EXISTS idx_kvkk_talepler_durum ON aura_kvkk_talepler(durum);

-- ====================================================================
-- RLS (ROW LEVEL SECURITY) POLİTİKALARI
-- ====================================================================
-- Not: Kolaylık ve tam uyumluluk açısından RLS etkinleştirilmiş olup, 
-- tüm yetkilendirilmiş kullanıcılara genel haklar tanımlanmıştır.

ALTER TABLE ayarlar_kaynaklar ENABLE ROW LEVEL SECURITY;
ALTER TABLE personel_izinleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_finans ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_stok_hareketleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_servis_parcalari ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayi_basvurulari ENABLE ROW LEVEL SECURITY;
ALTER TABLE onarim_talepleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_courier ENABLE ROW LEVEL SECURITY;
ALTER TABLE satis_gecmisi ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_vitrin_cihazlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_upsell_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_wiki ENABLE ROW LEVEL SECURITY;
ALTER TABLE urunler ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_store_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE destek_talepleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayi_destek ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_online_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_kvkk_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_kvkk_talepler ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_expertise_reports ENABLE ROW LEVEL SECURITY;

-- Politikaları Tanımla (Geniş İzinli, Auth ve Anonim Rol Uyumlu)
CREATE POLICY "Public Read/Write on ayarlar_kaynaklar" ON ayarlar_kaynaklar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on personel_izinleri" ON personel_izinleri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_jobs" ON aura_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_finans" ON aura_finans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_stok" ON aura_stok FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_stok_hareketleri" ON aura_stok_hareketleri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_servis_parcalari" ON aura_servis_parcalari FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_timeline" ON aura_timeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on bayi_basvurulari" ON bayi_basvurulari FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on onarim_talepleri" ON onarim_talepleri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_courier" ON aura_courier FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on satis_gecmisi" ON satis_gecmisi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_vitrin_cihazlari" ON aura_vitrin_cihazlari FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_upsell_products" ON aura_upsell_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_payments" ON aura_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_wiki" ON aura_wiki FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on urunler" ON urunler FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_store_sales" ON aura_store_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on destek_talepleri" ON destek_talepleri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on bayi_destek" ON bayi_destek FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_online_forms" ON aura_online_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_reviews" ON aura_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_kvkk_log" ON aura_kvkk_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_kvkk_talepler" ON aura_kvkk_talepler FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write on aura_expertise_reports" ON aura_expertise_reports FOR ALL USING (true) WITH CHECK (true);
