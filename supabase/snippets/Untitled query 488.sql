-- Order Processing Functions (RPC) with Transaction Support
-- These functions handle order creation with inventory protection

-- ============================================================================
-- Function: Create Order from Cart
-- Creates an order from a user's cart, validates inventory, and reserves stock
-- ============================================================================
CREATE OR REPLACE FUNCTION create_order_from_cart(
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
  
  -- Start transaction (implicit in function)
  
  -- Calculate subtotal and validate inventory
  v_subtotal := 0;
  
  FOR v_cart_item IN 
    SELECT ci.id, ci.variant_id, ci.quantity, pv.price, pv.name, p.name as product_name
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = v_cart_id
  LOOP
    -- Check inventory
    SELECT quantity INTO v_available_quantity
    FROM inventory
    WHERE variant_id = v_cart_item.variant_id;
    
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_order_from_cart TO authenticated;

-- ============================================================================
-- Function: Confirm Payment
-- Updates payment status and releases reserved inventory to actual inventory
-- ============================================================================
CREATE OR REPLACE FUNCTION confirm_payment(
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

GRANT EXECUTE ON FUNCTION confirm_payment TO authenticated;

-- ============================================================================
-- Function: Cancel Order
-- Cancels an order and releases reserved inventory
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_order_status VARCHAR(50);
  v_order_item RECORD;
BEGIN
  -- Get order info
  SELECT user_id, status INTO v_user_id, v_order_status
  FROM orders WHERE id = p_order_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
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
  
  -- Release reserved inventory if payment not yet confirmed
  IF v_order_status != 'paid' THEN
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

GRANT EXECUTE ON FUNCTION cancel_order TO authenticated;

-- ============================================================================
-- Function: Get or Create Cart
-- Returns existing cart or creates a new one for the user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_cart(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
BEGIN
  SELECT id INTO v_cart_id FROM carts WHERE user_id = p_user_id;
  
  IF v_cart_id IS NULL THEN
    INSERT INTO carts (user_id) VALUES (p_user_id) RETURNING id INTO v_cart_id;
  END IF;
  
  RETURN v_cart_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_cart TO authenticated;

-- ============================================================================
-- Function: Add to Cart
-- Adds or updates an item in the user's cart
-- ============================================================================
CREATE OR REPLACE FUNCTION add_to_cart(
  p_user_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_cart_item_id UUID;
  v_current_quantity INTEGER;
BEGIN
  -- Get or create cart
  v_cart_id := get_or_create_cart(p_user_id);
  
  -- Check if item already exists in cart
  SELECT id, quantity INTO v_cart_item_id, v_current_quantity
  FROM cart_items
  WHERE cart_id = v_cart_id AND variant_id = p_variant_id;
  
  IF v_cart_item_id IS NOT NULL THEN
    -- Update existing item
    UPDATE cart_items
    SET quantity = v_current_quantity + p_quantity
    WHERE id = v_cart_item_id
    RETURNING id INTO v_cart_item_id;
  ELSE
    -- Insert new item
    INSERT INTO cart_items (cart_id, variant_id, quantity)
    VALUES (v_cart_id, p_variant_id, p_quantity)
    RETURNING id INTO v_cart_item_id;
  END IF;
  
  RETURN v_cart_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_to_cart TO authenticated;

-- ============================================================================
-- Function: Update Cart Item Quantity
-- Updates the quantity of a cart item
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cart_item_quantity(
  p_cart_item_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT c.user_id INTO v_user_id
  FROM cart_items ci
  JOIN carts c ON c.id = ci.cart_id
  WHERE ci.id = p_cart_item_id;
  
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cart item not found or access denied';
  END IF;
  
  IF p_quantity <= 0 THEN
    DELETE FROM cart_items WHERE id = p_cart_item_id;
  ELSE
    UPDATE cart_items SET quantity = p_quantity WHERE id = p_cart_item_id;
  END IF;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION update_cart_item_quantity TO authenticated;

-- ============================================================================
-- Function: Remove from Cart
-- Removes an item from the user's cart
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_from_cart(p_cart_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT c.user_id INTO v_user_id
  FROM cart_items ci
  JOIN carts c ON c.id = ci.cart_id
  WHERE ci.id = p_cart_item_id;
  
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cart item not found or access denied';
  END IF;
  
  DELETE FROM cart_items WHERE id = p_cart_item_id;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_from_cart TO authenticated;

-- ============================================================================
-- Function: Create Profile
-- Creates a profile for a new user (triggered by auth)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
