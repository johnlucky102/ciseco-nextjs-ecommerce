-- Phase 11: Admin RLS policies for existing catalog and commerce tables
-- Depends on: 20260523000000_admin_rbac.sql (has_role, is_admin functions)

-- ============================================================================
-- CATALOG TABLES: Admin/catalog_manager full CRUD + read all
-- ============================================================================

-- Categories
CREATE POLICY "Admins can select all categories"
  ON categories FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Rooms
CREATE POLICY "Admins can select all rooms"
  ON rooms FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert rooms"
  ON rooms FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update rooms"
  ON rooms FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Materials
CREATE POLICY "Admins can select all materials"
  ON materials FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert materials"
  ON materials FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update materials"
  ON materials FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete materials"
  ON materials FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Products (admin sees all statuses: active, draft, archived)
CREATE POLICY "Admins can select all products"
  ON products FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Product images
CREATE POLICY "Admins can select all product images"
  ON product_images FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert product images"
  ON product_images FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update product images"
  ON product_images FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete product images"
  ON product_images FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Product variants
CREATE POLICY "Admins can select all product variants"
  ON product_variants FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert product variants"
  ON product_variants FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update product variants"
  ON product_variants FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete product variants"
  ON product_variants FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Product variant materials
CREATE POLICY "Admins can select all variant materials"
  ON product_variant_materials FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert variant materials"
  ON product_variant_materials FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update variant materials"
  ON product_variant_materials FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can delete variant materials"
  ON product_variant_materials FOR DELETE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- Inventory: admin and catalog_manager can manage stock directly
CREATE POLICY "Admins can select inventory"
  ON inventory FOR SELECT
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (public.has_role('admin') OR public.has_role('catalog_manager'));

CREATE POLICY "Admins can update inventory"
  ON inventory FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('catalog_manager'));

-- ============================================================================
-- COMMERCE TABLES: Admin read-all, limited write via roles
-- ============================================================================

-- Profiles: admin/support can view for customer service
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    public.has_role('admin') OR
    public.has_role('order_manager') OR
    public.has_role('support')
  );

-- Addresses: admin/support can view for delivery coordination
CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (
    public.has_role('admin') OR
    public.has_role('order_manager') OR
    public.has_role('support')
  );

-- Orders: admin/order_manager/support can view all
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    public.has_role('admin') OR
    public.has_role('order_manager') OR
    public.has_role('support')
  );

-- Orders: admin/order_manager can update (status, notes, logistics)
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('order_manager'));

-- Order items: admin can view all for reporting
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    public.has_role('admin') OR
    public.has_role('order_manager') OR
    public.has_role('support')
  );

-- Payments: admin/order_manager can view for reconciliation
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    public.has_role('admin') OR
    public.has_role('order_manager') OR
    public.has_role('support')
  );

-- Payments: admin/order_manager can update status for manual reconciliation
CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('order_manager'));

-- Reviews: admin/support can moderate
CREATE POLICY "Admins can select all reviews"
  ON reviews FOR SELECT
  USING (public.has_role('admin') OR public.has_role('support'));

CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  USING (public.has_role('admin') OR public.has_role('support'));

CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  USING (public.has_role('admin'));
