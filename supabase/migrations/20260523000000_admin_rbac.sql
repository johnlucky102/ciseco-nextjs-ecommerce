-- Phase 11: Admin RBAC foundation
-- user_roles, admin_audit_logs, helper functions, RLS policies

-- user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'catalog_manager', 'order_manager', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- admin_audit_logs table
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,       -- 'create' | 'update' | 'delete' | 'status_change' | 'inventory_adjust' | 'role_assign' | 'role_revoke'
  entity_type TEXT NOT NULL,  -- 'product' | 'order' | 'inventory' | 'user_role' | 'review' | 'payment'
  entity_id TEXT,             -- UUID as text for flexibility
  before JSONB,               -- snapshot before change
  after JSONB,                -- snapshot after change
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- has_role: checks if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$;

-- is_admin: shorthand for has_role('admin')
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_role('admin');
END;
$$;

-- has_any_admin_role: returns true for any staff/admin role
CREATE OR REPLACE FUNCTION public.has_any_admin_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'catalog_manager', 'order_manager', 'support')
  );
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- user_roles: users can view their own role (needed for middleware check)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- user_roles: admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin());

-- user_roles: only admins can assign roles
CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin());

-- user_roles: only admins can revoke roles
CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin());

-- admin_audit_logs: any admin-role user can read logs
CREATE POLICY "Admin role users can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.has_any_admin_role());

-- admin_audit_logs: insert allowed from service role or via SECURITY DEFINER functions
CREATE POLICY "Service role or admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.has_any_admin_role());
