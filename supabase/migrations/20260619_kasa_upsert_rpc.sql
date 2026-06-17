-- Atomik kasa bakiyesi güncelleme (tek transaction)

CREATE OR REPLACE FUNCTION upsert_kasa_balance(p_tenant_id UUID, p_balance NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE accounts
  SET balance = p_balance
  WHERE tenant_id = p_tenant_id AND type = 'kasa';

  IF NOT FOUND THEN
    INSERT INTO accounts (tenant_id, name, type, balance, currency)
    VALUES (p_tenant_id, 'Kasa', 'kasa', p_balance, 'TRY');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_kasa_balance(UUID, NUMERIC) TO authenticated, service_role;
