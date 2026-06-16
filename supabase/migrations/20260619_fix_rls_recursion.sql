-- get_current_tenant_id() RLS içinden user_profiles okurken sonsuz döngüyü önler.
-- profiles_own_read politikası tenant_id = get_current_tenant_id() içerdiği için
-- SECURITY DEFINER olmadan "stack depth limit exceeded" (54001) oluşur.

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$;
