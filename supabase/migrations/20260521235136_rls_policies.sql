-- Row Level Security (RLS) Policies for Furniture E-commerce

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PUBLIC READ ACCESS (Catalog tables - active products only)
-- ============================================================================

-- Categories: Public read for active categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (is_active = true);

-- Rooms: Public read for active rooms
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (is_active = true);

-- Materials: Public read for active materials
CREATE POLICY "Materials are viewable by everyone"
  ON materials FOR SELECT
  USING (is_active = true);

-- Products: Public read for active products only
CREATE POLICY "Active products are viewable by everyone"
  ON products FOR SELECT
  USING (status = 'active');

-- Product Images: Public read for images of active products
CREATE POLICY "Product images are viewable by everyone"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.status = 'active'
    )
  );

-- Product Variants: Public read for active variants of active products
CREATE POLICY "Active variants are viewable by everyone"
  ON product_variants FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.status = 'active'
    )
  );

-- Product Variant Materials: Public read for materials of active variants
CREATE POLICY "Variant materials are viewable by everyone"
  ON product_variant_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_variants
      JOIN products ON products.id = product_variants.product_id
      WHERE product_variants.id = product_variant_materials.variant_id
      AND product_variants.is_active = true
      AND products.status = 'active'
    )
  );

-- Inventory: No direct public access (handled via server functions)
CREATE POLICY "No direct access to inventory"
  ON inventory FOR ALL
  USING (false);

-- ============================================================================
-- OWNER-ONLY ACCESS (Commerce tables - tied to auth.uid())
-- ============================================================================

-- Profiles: Users can read/write their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Addresses: Users can read/write their own addresses
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Carts: Users can read/write their own cart
CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id);

-- Cart Items: Users can read/write items in their cart
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- Orders: Users can read their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Order creation is handled via server function, not direct inserts
CREATE POLICY "No direct order insert"
  ON orders FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct order update"
  ON orders FOR UPDATE
  USING (false);

CREATE POLICY "No direct order delete"
  ON orders FOR DELETE
  USING (false);

-- Order Items: Users can read items from their orders
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Order items are created via server function
CREATE POLICY "No direct order item insert"
  ON order_items FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct order item update"
  ON order_items FOR UPDATE
  USING (false);

CREATE POLICY "No direct order item delete"
  ON order_items FOR DELETE
  USING (false);

-- Payments: Users can read their own payment records
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Payments are created via server function
CREATE POLICY "No direct payment insert"
  ON payments FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct payment update"
  ON payments FOR UPDATE
  USING (false);

CREATE POLICY "No direct payment delete"
  ON payments FOR DELETE
  USING (false);

-- Reviews: Users can read all reviews, but only write their own
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Wishlists: Users can read/write their own wishlist
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist item"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist item"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SERVICE ROLE ACCESS (for server-side operations)
-- ============================================================================

-- Service role can bypass RLS for all tables (handled by Supabase automatically)
-- Additional service role policies for inventory management
CREATE POLICY "Service role can manage inventory"
  ON inventory FOR ALL
  USING (auth.role() = 'service_role');
