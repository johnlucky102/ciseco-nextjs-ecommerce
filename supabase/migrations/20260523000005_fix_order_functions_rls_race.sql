-- Fix order functions RLS isolation, double-release logic, and race condition issues
-- Adds foreign key between user_roles and profiles to enable seamless PostgREST joins

-- 1. Ensure user_roles has direct join reference to profiles for PostgREST
ALTER TABLE IF EXISTS public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_profiles_fkey,
  ADD CONSTRAINT user_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Fix create_order_from_cart with FOR UPDATE row-level locking to prevent B5 race conditions
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_user_id UUID,
  p_shipping_address JSONB,
  p_payment_method VARCHAR(100),
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_order_id UUID;
  v_order_number VARCHAR(255);
  v_subtotal DECIMAL(12, 2);
  v_shipping_cost DECIMAL(12, 2) DEFAULT 0;
  v_tax DECIMAL(12, 2) DEFAULT 0;
  v_total DECIMAL(12, 2);
  v_cart_item RECORD;
  v_variant_price DECIMAL(12, 2);
  v_variant_name VARCHAR(255);
  v_product_name VARCHAR(500);
  v_available_quantity INTEGER;
BEGIN
  -- Get user's cart
  SELECT id INTO v_cart_id FROM carts WHERE user_id = p_user_id;
  
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'Cart not found for user';
  END IF;
  
  -- Calculate subtotal and validate inventory (LOCKING row for update to avoid race conditions)
  v_subtotal := 0;
  
  FOR v_cart_item IN 
    SELECT ci.id, ci.variant_id, ci.quantity, pv.price, pv.name, p.name as product_name
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = v_cart_id
  LOOP
    -- Check and LOCK inventory row
    SELECT quantity INTO v_available_quantity
    FROM inventory
    WHERE variant_id = v_cart_item.variant_id
    FOR UPDATE;
    
    IF v_available_quantity IS NULL THEN
      RAISE EXCEPTION 'Inventory record not found for variant %', v_cart_item.variant_id;
    END IF;
    
    IF v_available_quantity - (SELECT COALESCE(reserved_quantity, 0) FROM inventory WHERE variant_id = v_cart_item.variant_id) < v_cart_item.quantity THEN
      RAISE EXCEPTION 'Insufficient inventory for variant %', v_cart_item.variant_id;
    END IF;
    
    -- Add to subtotal
    v_subtotal := v_subtotal + (v_cart_item.price * v_cart_item.quantity);
  END LOOP;
  
  -- Calculate totals
  v_total := v_subtotal + v_shipping_cost + v_tax;
  
  -- Create order
  INSERT INTO orders (
    user_id,
    status,
    subtotal,
    shipping_cost,
    tax,
    total,
    currency,
    shipping_full_name,
    shipping_phone,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state_province,
    shipping_postal_code,
    shipping_country,
    payment_method,
    payment_status,
    notes,
    confirmed_at
  ) VALUES (
    p_user_id,
    'confirmed',
    v_subtotal,
    v_shipping_cost,
    v_tax,
    v_total,
    'VND',
    p_shipping_address->>'full_name',
    p_shipping_address->>'phone',
    p_shipping_address->>'address_line1',
    p_shipping_address->>'address_line2',
    p_shipping_address->>'city',
    p_shipping_address->>'state_province',
    p_shipping_address->>'postal_code',
    COALESCE(p_shipping_address->>'country', 'Vietnam'),
    p_payment_method,
    'unpaid',
    p_notes,
    NOW()
  ) RETURNING id, order_number INTO v_order_id, v_order_number;
  
  -- Create order items and reserve inventory
  FOR v_cart_item IN 
    SELECT ci.id, ci.variant_id, ci.quantity, pv.price, pv.name, p.name as product_name
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = v_cart_id
  LOOP
    -- Insert order item
    INSERT INTO order_items (
      order_id,
      variant_id,
      product_name,
      variant_name,
      price,
      quantity,
      total
    ) VALUES (
      v_order_id,
      v_cart_item.variant_id,
      v_cart_item.product_name,
      v_cart_item.name,
      v_cart_item.price,
      v_cart_item.quantity,
      v_cart_item.price * v_cart_item.quantity
    );
    
    -- Reserve inventory
    UPDATE inventory
    SET 
      reserved_quantity = reserved_quantity + v_cart_item.quantity,
      last_updated_at = NOW()
    WHERE variant_id = v_cart_item.variant_id;
  END LOOP;
  
  -- Clear cart
  DELETE FROM cart_items WHERE cart_id = v_cart_id;
  
  RETURN v_order_id;
END;
$$;


-- 3. Fix confirm_payment with RLS ownership checks to prevent B2 vulnerability
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_order_id UUID,
  p_payment_id VARCHAR(500),
  p_payment_gateway VARCHAR(255)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_order_item RECORD;
BEGIN
  -- Get order user_id for security check
  SELECT user_id INTO v_user_id FROM orders WHERE id = p_order_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- B1/B2 Ownership check: Must be owner, service role (system callback), or admin/manager
  IF auth.uid() <> v_user_id 
     AND auth.role() <> 'service_role' 
     AND NOT public.has_role('admin') 
     AND NOT public.has_role('order_manager') THEN
    RAISE EXCEPTION 'Unauthorized operation on this order';
  END IF;
  
  -- Update payment status
  UPDATE orders
  SET 
    payment_status = 'paid',
    payment_id = p_payment_id,
    status = 'processing'
  WHERE id = p_order_id;
  
  -- Create payment record
  INSERT INTO payments (
    order_id,
    payment_method,
    amount,
    currency,
    status,
    transaction_id,
    payment_gateway,
    payment_date
  )
  SELECT 
    p_order_id,
    payment_method,
    total,
    currency,
    'completed',
    p_payment_id,
    p_payment_gateway,
    NOW()
  FROM orders
  WHERE id = p_order_id;
  
  -- Release reserved inventory (convert to actual sold)
  FOR v_order_item IN 
    SELECT variant_id, quantity
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    UPDATE inventory
    SET 
      quantity = quantity - v_order_item.quantity,
      reserved_quantity = reserved_quantity - v_order_item.quantity,
      last_updated_at = NOW()
    WHERE variant_id = v_order_item.variant_id;
  END LOOP;
  
  RETURN true;
END;
$$;


-- 4. Fix cancel_order with RLS ownership checks and B4 correct column status check
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_order_status VARCHAR(50);
  v_payment_status VARCHAR(50);
  v_order_item RECORD;
BEGIN
  -- Get order info
  SELECT user_id, status, payment_status INTO v_user_id, v_order_status, v_payment_status
  FROM orders WHERE id = p_order_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- B1/B2 Ownership check: Must be owner, service role (system callback), or admin/manager
  IF auth.uid() <> v_user_id 
     AND auth.role() <> 'service_role' 
     AND NOT public.has_role('admin') 
     AND NOT public.has_role('order_manager') THEN
    RAISE EXCEPTION 'Unauthorized operation on this order';
  END IF;
  
  IF v_order_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot cancel order with status %', v_order_status;
  END IF;
  
  -- Update order status
  UPDATE orders
  SET 
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE id = p_order_id;
  
  -- Release reserved inventory if payment not yet confirmed (Using B4 correct column: v_payment_status)
  IF v_payment_status != 'paid' THEN
    FOR v_order_item IN 
      SELECT variant_id, quantity
      FROM order_items
      WHERE order_id = p_order_id
    LOOP
      UPDATE inventory
      SET 
        reserved_quantity = GREATEST(reserved_quantity - v_order_item.quantity, 0),
        last_updated_at = NOW()
      WHERE variant_id = v_order_item.variant_id;
    END LOOP;
  END IF;
  
  RETURN true;
END;
$$;
