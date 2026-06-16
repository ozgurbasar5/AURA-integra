-- ============================================================================
-- AURA İntegra — Mükerrer finans kayıtları temizliği (tek seferlik)
-- ============================================================================
-- Neden: uid() prefix'li id'ler (ft_<uuid>) UUID sayılmadığı için her push'ta
--        yeni financial_transactions satırı eklenmiş olabilir.
--
-- Ne yapar:
--   1) Servis teslim gelir mükerrerlerini siler (tenant + service_id başına 1)
--   2) Servis gider mükerrerlerini siler (tenant + service_id başına 1)
--   3) Tamamen aynı satırları siler (service_id olmayan genel işlemler)
--   4) service_orders.financial_posted / delivered_at / net_profit senkronlar
--   5) accounts (kasa) bakiyesini financial_transactions'tan yeniden hesaplar
--
-- ÖNEMLİ:
--   • Önce BÖLÜM A'daki önizleme sorgularını çalıştırın.
--   • Yedek alın veya staging'de deneyin.
--   • 20260618_security_audit.sql migration'ı uygulanmış olmalı (unique index).
--   • BÖLÜM B adımlarını B1→B7 sırasıyla çalıştırın (temp table yok).
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- BÖLÜM A — ÖNİZLEME (salt okunur, silme yok)
-- ═══════════════════════════════════════════════════════════════════════════

-- A1) Mükerrer servis teslim gelirleri
SELECT
  tenant_id,
  service_id,
  COUNT(*) AS duplicate_count,
  SUM(amount) AS total_inflated_amount,
  ARRAY_AGG(id ORDER BY created_at) AS all_ids,
  (ARRAY_AGG(id ORDER BY created_at ASC))[1] AS keep_id
FROM financial_transactions
WHERE service_id IS NOT NULL
  AND type = 'gelir'
  AND category = 'Servis Teslim'
GROUP BY tenant_id, service_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- A2) Mükerrer servis giderleri
SELECT
  tenant_id,
  service_id,
  COUNT(*) AS duplicate_count,
  SUM(amount) AS total_inflated_amount,
  ARRAY_AGG(id ORDER BY created_at) AS all_ids,
  (ARRAY_AGG(id ORDER BY created_at ASC))[1] AS keep_id
FROM financial_transactions
WHERE service_id IS NOT NULL
  AND type = 'gider'
  AND category = 'Servis Gider'
GROUP BY tenant_id, service_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- A3) Genel mükerrer işlemler (service_id olmayan, birebir aynı satırlar)
SELECT
  tenant_id, type, category, amount, order_no, description, transaction_date,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY created_at) AS all_ids
FROM financial_transactions
WHERE service_id IS NULL
GROUP BY tenant_id, type, category, amount, order_no, description, transaction_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 100;

-- A4) Kasa bakiyesi sapması (DB kasa vs hesaplanan)
SELECT
  a.tenant_id,
  t.company_name,
  a.balance AS kasa_db,
  COALESCE(tx.computed, 0) AS kasa_hesaplanan,
  a.balance - COALESCE(tx.computed, 0) AS fark
FROM accounts a
JOIN tenants t ON t.id = a.tenant_id
LEFT JOIN (
  SELECT
    tenant_id,
    COALESCE(SUM(
      CASE
        WHEN type = 'gelir' THEN amount
        WHEN type = 'gider' THEN -amount
        ELSE 0
      END
    ), 0) AS computed
  FROM financial_transactions
  GROUP BY tenant_id
) tx ON tx.tenant_id = a.tenant_id
WHERE a.type = 'kasa'
  AND ABS(a.balance - COALESCE(tx.computed, 0)) > 0.01
ORDER BY ABS(a.balance - COALESCE(tx.computed, 0)) DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- BÖLÜM B — TEMİZLİK
-- Supabase SQL Editor ifadeleri ayrı oturumlarda çalıştırabilir; temp table
-- kullanılmıyor. B1→B6 sırasıyla çalıştırın (hepsini seçip Run da olur).
-- ═══════════════════════════════════════════════════════════════════════════

-- B1) Özet: silinecek mükerrer sayıları
SELECT 'delivery_income_dupes' AS bucket, COUNT(*) AS to_delete
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY tenant_id, service_id ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM financial_transactions
  WHERE service_id IS NOT NULL AND type = 'gelir' AND category = 'Servis Teslim'
) x WHERE rn > 1
UNION ALL
SELECT 'delivery_expense_dupes', COUNT(*)
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY tenant_id, service_id ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM financial_transactions
  WHERE service_id IS NOT NULL AND type = 'gider' AND category = 'Servis Gider'
) x WHERE rn > 1
UNION ALL
SELECT 'generic_dupes', COUNT(*)
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY tenant_id, type, category, amount,
                 COALESCE(order_no, ''), COALESCE(description, ''), transaction_date
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM financial_transactions
  WHERE service_id IS NULL
) x WHERE rn > 1;

-- B2) Mükerrer servis teslim gelirlerini sil (en eski kayıt kalır)
DELETE FROM financial_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, service_id ORDER BY created_at ASC, id ASC
    ) AS rn
    FROM financial_transactions
    WHERE service_id IS NOT NULL AND type = 'gelir' AND category = 'Servis Teslim'
  ) ranked WHERE rn > 1
);

-- B3) Mükerrer servis giderlerini sil
DELETE FROM financial_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, service_id ORDER BY created_at ASC, id ASC
    ) AS rn
    FROM financial_transactions
    WHERE service_id IS NOT NULL AND type = 'gider' AND category = 'Servis Gider'
  ) ranked WHERE rn > 1
);

-- B4) Genel birebir mükerrer işlemleri sil (service_id NULL)
DELETE FROM financial_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, type, category, amount,
                   COALESCE(order_no, ''), COALESCE(description, ''), transaction_date
      ORDER BY created_at ASC, id ASC
    ) AS rn
    FROM financial_transactions
    WHERE service_id IS NULL
  ) ranked WHERE rn > 1
);

-- B5) service_orders — financial_posted / delivered_at / net_profit senkronu
WITH delivery_income AS (
  SELECT DISTINCT ON (tenant_id, service_id)
    tenant_id, service_id, amount, created_at
  FROM financial_transactions
  WHERE service_id IS NOT NULL AND type = 'gelir' AND category = 'Servis Teslim'
  ORDER BY tenant_id, service_id, created_at ASC
),
delivery_expense AS (
  SELECT tenant_id, service_id, COALESCE(SUM(amount), 0) AS total_expense
  FROM financial_transactions
  WHERE service_id IS NOT NULL AND type = 'gider' AND category = 'Servis Gider'
  GROUP BY tenant_id, service_id
)
UPDATE service_orders so
SET
  financial_posted = true,
  delivered_at = COALESCE(so.delivered_at, di.created_at),
  actual_cost = COALESCE(so.actual_cost, di.amount),
  net_profit = COALESCE(di.amount, 0) - COALESCE(de.total_expense, 0)
FROM delivery_income di
LEFT JOIN delivery_expense de
  ON de.tenant_id = di.tenant_id AND de.service_id = di.service_id
WHERE so.id = di.service_id AND so.tenant_id = di.tenant_id;

UPDATE service_orders so
SET financial_posted = false
WHERE so.financial_posted = true
  AND NOT EXISTS (
    SELECT 1 FROM financial_transactions ft
    WHERE ft.service_id = so.id AND ft.tenant_id = so.tenant_id
      AND ft.type = 'gelir' AND ft.category = 'Servis Teslim'
  );

-- B6) Kasa bakiyesini yeniden hesapla
UPDATE accounts a
SET balance = c.balance
FROM (
  SELECT tenant_id,
    COALESCE(SUM(CASE WHEN type = 'gelir' THEN amount WHEN type = 'gider' THEN -amount ELSE 0 END), 0) AS balance
  FROM financial_transactions
  GROUP BY tenant_id
) c
WHERE a.tenant_id = c.tenant_id AND a.type = 'kasa';

INSERT INTO accounts (tenant_id, name, type, balance, currency)
SELECT t.id, 'Kasa', 'kasa', COALESCE(c.balance, 0), 'TRY'
FROM tenants t
LEFT JOIN (
  SELECT tenant_id,
    COALESCE(SUM(CASE WHEN type = 'gelir' THEN amount WHEN type = 'gider' THEN -amount ELSE 0 END), 0) AS balance
  FROM financial_transactions
  GROUP BY tenant_id
) c ON c.tenant_id = t.id
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a WHERE a.tenant_id = t.id AND a.type = 'kasa'
);

-- B7) Sonuç özeti
SELECT
  (SELECT COUNT(*) FROM financial_transactions) AS remaining_tx_count,
  (SELECT COUNT(*) FROM service_orders WHERE financial_posted = true) AS posted_orders;


-- ═══════════════════════════════════════════════════════════════════════════
-- BÖLÜM C — OPSİYONEL (gerekirse ayrı çalıştırın)
-- ═══════════════════════════════════════════════════════════════════════════

-- C1) Sahipsiz cihaz talepleri (tenant_id NULL) — köprü hatası sonrası
-- SELECT id, customer_name, created_at FROM device_requests WHERE tenant_id IS NULL;

-- DELETE FROM device_requests WHERE tenant_id IS NULL;

-- C2) Plain text api_key kalmış tenant'lar (hash migration sonrası)
-- UPDATE tenants
-- SET api_key_hash = encode(digest(api_key, 'sha256'), 'hex')
-- WHERE api_key IS NOT NULL AND api_key_hash IS NULL;
-- UPDATE tenants SET api_key = NULL WHERE api_key_hash IS NOT NULL;
