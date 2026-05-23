-- Step 1: Create user in auth.users
-- NOTE: GoTrue requires token columns to be '' (empty string), NOT NULL
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  crypt('Admin@123456', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  false,
  '', '', '', '', '', '', '', ''
);

-- Step 2: Bootstrap admin role
SELECT admin_bootstrap_first_admin(id)
FROM auth.users
WHERE email = 'admin@example.com';

-- Step 3: Verify
SELECT u.email, ur.role, ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@example.com';
