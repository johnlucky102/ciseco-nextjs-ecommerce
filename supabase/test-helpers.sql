-- Test helper functions — only for local development, NOT for production migrations
-- Call: SELECT create_test_user('email@test.com', 'password');
-- Call: SELECT delete_test_user('email@test.com');

CREATE OR REPLACE FUNCTION create_test_user(p_email TEXT, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  v_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_id, p_email,
    crypt(p_password, gen_salt('bf', 6)),
    NOW(), NOW(), NOW(),
    'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_test_user TO service_role;

CREATE OR REPLACE FUNCTION delete_test_user(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE email = p_email;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_test_user TO service_role;

CREATE OR REPLACE FUNCTION delete_test_user_by_id(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_test_user_by_id TO service_role;
