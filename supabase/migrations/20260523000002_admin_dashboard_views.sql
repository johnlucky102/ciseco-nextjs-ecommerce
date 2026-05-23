-- Phase 12: Admin dashboard aggregate views and KPI functions
-- Depends on: 20260523000000_admin_rbac.sql

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Low stock variants (available <= low_stock_threshold)
CREATE OR REPLACE VIEW admin_low_stock AS
SELECT
  i.id AS inventory_id,
  i.variant_id,
  pv.name AS variant_name,
  pv.sku,
  p.name AS product_name,
  p.id AS product_id,
  p.slug AS product_slug,
  i.quantity,
  i.reserved_quantity,
  (i.quantity - i.reserved_quantity) AS available,
  i.low_stock_threshold
FROM inventory i
JOIN product_variants pv ON pv.id = i.variant_id
JOIN products p ON p.id = pv.product_id
WHERE (i.quantity - i.reserved_quantity) <= i.low_stock_threshold
ORDER BY (i.quantity - i.reserved_quantity) ASC;

-- Top products by sales (last 90 days)
CREATE OR REPLACE VIEW admin_top_products AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.slug,
  COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
  COALESCE(SUM(oi.total), 0) AS total_revenue
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN order_items oi ON oi.variant_id = pv.id
LEFT JOIN orders o ON o.id = oi.order_id
  AND o.status NOT IN ('cancelled', 'refunded')
  AND o.created_at >= NOW() - INTERVAL '90 days'
GROUP BY p.id, p.name, p.slug
ORDER BY total_quantity_sold DESC
LIMIT 10;

-- Daily revenue (last 30 days)
CREATE OR REPLACE VIEW admin_daily_revenue AS
SELECT
  DATE(o.created_at) AS day,
  COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) AS revenue,
  COUNT(o.id) AS order_count
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(o.created_at)
ORDER BY day ASC;

-- Order status distribution
CREATE OR REPLACE VIEW admin_order_status_counts AS
SELECT
  status,
  COUNT(*) AS count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- RPC FUNCTIONS FOR DASHBOARD
-- ============================================================================

-- Dashboard KPI summary
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_kpi()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_low_stock_count INTEGER;
BEGIN
  IF NOT public.has_any_admin_role() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO v_low_stock_count
  FROM admin_low_stock;

  SELECT jsonb_build_object(
    'revenue_today',
      COALESCE(SUM(CASE
        WHEN DATE(created_at) = CURRENT_DATE AND payment_status = 'paid'
        THEN total ELSE 0
      END), 0),
    'revenue_this_month',
      COALESCE(SUM(CASE
        WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
          AND payment_status = 'paid'
        THEN total ELSE 0
      END), 0),
    'orders_pending',
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0),
    'orders_confirmed',
      COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0),
    'orders_in_production',
      COALESCE(SUM(CASE WHEN status = 'in_production' THEN 1 ELSE 0 END), 0),
    'orders_ready',
      COALESCE(SUM(CASE WHEN status = 'ready_to_ship' THEN 1 ELSE 0 END), 0),
    'orders_shipping',
      COALESCE(SUM(CASE WHEN status = 'shipping_installing' THEN 1 ELSE 0 END), 0),
    'orders_completed_today',
      COALESCE(SUM(CASE
        WHEN status = 'completed' AND DATE(delivered_at) = CURRENT_DATE
        THEN 1 ELSE 0
      END), 0),
    'total_orders', COUNT(*),
    'low_stock_count', v_low_stock_count
  )
  INTO result
  FROM orders;

  RETURN result;
END;
$$;
