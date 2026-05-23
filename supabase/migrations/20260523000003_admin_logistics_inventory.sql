-- Phase 14 & 15: Logistics tables, inventory adjustments, admin RPCs
-- Depends on: 20260523000000_admin_rbac.sql

-- ============================================================================
-- LOGISTICS TABLES
-- ============================================================================

-- order_status_events: immutable audit trail for order status transitions
CREATE TABLE public.order_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- installation_teams: delivery & installation crews
CREATE TABLE public.installation_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  leader_name VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active', -- active | inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- delivery_vehicles
CREATE TABLE public.delivery_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate VARCHAR(50) NOT NULL UNIQUE,
  vehicle_type VARCHAR(100),     -- 'truck' | 'van' | 'pickup'
  capacity_kg DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'available', -- available | in_use | maintenance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_fulfillments: logistics assignment per order
CREATE TABLE public.order_fulfillments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  team_id UUID REFERENCES installation_teams(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES delivery_vehicles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY ADJUSTMENTS TABLE (Phase 15)
-- ============================================================================

CREATE TABLE public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,          -- positive = added, negative = removed
  reason VARCHAR(255) NOT NULL,    -- 'nhập kho' | 'kiểm kê lệch' | 'hư hỏng' | 'hoàn hàng' | 'điều chỉnh'
  before_quantity INTEGER NOT NULL,
  after_quantity INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_status_events_order ON public.order_status_events(order_id);
CREATE INDEX idx_order_status_events_created ON public.order_status_events(created_at DESC);
CREATE INDEX idx_order_fulfillments_order ON public.order_fulfillments(order_id);
CREATE INDEX idx_inventory_adjustments_variant ON public.inventory_adjustments(variant_id);
CREATE INDEX idx_inventory_adjustments_admin ON public.inventory_adjustments(admin_user_id);
CREATE INDEX idx_inventory_adjustments_created ON public.inventory_adjustments(created_at DESC);

-- Updated at triggers
CREATE TRIGGER update_installation_teams_updated_at BEFORE UPDATE ON public.installation_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_vehicles_updated_at BEFORE UPDATE ON public.delivery_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_fulfillments_updated_at BEFORE UPDATE ON public.order_fulfillments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- order_status_events: customer can see events for own orders
CREATE POLICY "Users can view status events for own orders"
  ON public.order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_events.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all status events"
  ON public.order_status_events FOR SELECT
  USING (
    public.has_role('admin') OR
    public.has_role('order_manager') OR
    public.has_role('support')
  );

CREATE POLICY "Admins can insert status events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('order_manager'));

-- installation_teams: admin/order_manager manage
CREATE POLICY "Admins can manage installation teams"
  ON public.installation_teams FOR ALL
  USING (public.has_role('admin') OR public.has_role('order_manager'))
  WITH CHECK (public.has_role('admin') OR public.has_role('order_manager'));

-- delivery_vehicles: admin/order_manager manage
CREATE POLICY "Admins can manage delivery vehicles"
  ON public.delivery_vehicles FOR ALL
  USING (public.has_role('admin') OR public.has_role('order_manager'))
  WITH CHECK (public.has_role('admin') OR public.has_role('order_manager'));

-- order_fulfillments: admin/order_manager manage
CREATE POLICY "Admins can manage order fulfillments"
  ON public.order_fulfillments FOR ALL
  USING (public.has_role('admin') OR public.has_role('order_manager'))
  WITH CHECK (public.has_role('admin') OR public.has_role('order_manager'));

-- inventory_adjustments: admin/catalog_manager
CREATE POLICY "Admins can view inventory adjustments"
  ON public.inventory_adjustments FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert inventory adjustments"
  ON public.inventory_adjustments FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

-- ============================================================================
-- RPC: admin_update_order_status (Phase 14)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_next_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_is_valid BOOLEAN := false;
BEGIN
  IF NOT (public.has_role('admin') OR public.has_role('order_manager')) THEN
    RAISE EXCEPTION 'Unauthorized: admin or order_manager role required';
  END IF;

  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Valid transition matrix
  v_is_valid := (
    (v_current_status = 'pending'              AND p_next_status IN ('confirmed', 'cancelled')) OR
    (v_current_status = 'confirmed'            AND p_next_status IN ('in_production', 'cancelled')) OR
    (v_current_status = 'in_production'        AND p_next_status = 'ready_to_ship') OR
    (v_current_status = 'ready_to_ship'        AND p_next_status = 'shipping_installing') OR
    (v_current_status = 'shipping_installing'  AND p_next_status IN ('completed', 'cancelled')) OR
    -- Legacy compatibility
    (v_current_status = 'processing'           AND p_next_status IN ('shipped', 'cancelled')) OR
    (v_current_status = 'shipped'              AND p_next_status = 'delivered')
  );

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_current_status, p_next_status;
  END IF;

  UPDATE orders
  SET
    status = p_next_status,
    confirmed_at    = CASE WHEN p_next_status = 'confirmed'            THEN NOW() ELSE confirmed_at END,
    shipped_at      = CASE WHEN p_next_status = 'shipping_installing'  THEN NOW() ELSE shipped_at END,
    delivered_at    = CASE WHEN p_next_status = 'completed'            THEN NOW() ELSE delivered_at END,
    cancelled_at    = CASE WHEN p_next_status = 'cancelled'            THEN NOW() ELSE cancelled_at END,
    updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO order_status_events (order_id, from_status, to_status, actor_id, note)
  VALUES (p_order_id, v_current_status, p_next_status, auth.uid(), p_note);

  INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (
    auth.uid(),
    'status_change',
    'order',
    p_order_id::TEXT,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_next_status, 'note', p_note)
  );

  RETURN jsonb_build_object('success', true, 'from', v_current_status, 'to', p_next_status);
END;
$$;

-- ============================================================================
-- RPC: admin_adjust_inventory (Phase 15)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory(
  p_variant_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  IF NOT (public.has_role('admin') OR public.has_role('catalog_manager')) THEN
    RAISE EXCEPTION 'Unauthorized: admin or catalog_manager role required';
  END IF;

  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE variant_id = p_variant_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for variant';
  END IF;

  v_new_quantity := v_current_quantity + p_delta;

  IF v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Cannot reduce stock below 0. Current: %, Delta: %', v_current_quantity, p_delta;
  END IF;

  UPDATE inventory
  SET quantity = v_new_quantity, last_updated_at = NOW()
  WHERE variant_id = p_variant_id;

  INSERT INTO inventory_adjustments (
    variant_id, admin_user_id, delta, reason,
    before_quantity, after_quantity, note
  )
  VALUES (
    p_variant_id, auth.uid(), p_delta, p_reason,
    v_current_quantity, v_new_quantity, p_note
  );

  INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (
    auth.uid(),
    'inventory_adjust',
    'inventory',
    p_variant_id::TEXT,
    jsonb_build_object('quantity', v_current_quantity),
    jsonb_build_object(
      'quantity', v_new_quantity,
      'delta', p_delta,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'before', v_current_quantity,
    'after', v_new_quantity,
    'delta', p_delta
  );
END;
$$;

-- ============================================================================
-- BOOTSTRAP HELPER: insert first admin (run manually in Supabase Studio)
-- Usage: SELECT admin_bootstrap_first_admin('<your-user-uuid>');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_bootstrap_first_admin(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allowed if no admins exist yet
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN 'Admin already exists. Use roles management page to add more.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN 'Admin role granted to user ' || p_user_id::TEXT;
END;
$$;
