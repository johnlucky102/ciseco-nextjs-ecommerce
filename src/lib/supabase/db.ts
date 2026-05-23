import { createClient as createServerClient } from './server'

// ============================================================================
// Catalog Operations
// ============================================================================

export async function getCategories() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function getRooms() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function getMaterials() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function getProducts(filters?: {
  categoryId?: string
  roomId?: string
  search?: string
  orderBy?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createServerClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      room:rooms(*),
      product_images(*),
      product_variants(id, price, compare_at_price, color, is_default)
    `)
    .eq('status', 'active')

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.roomId) {
    query = query.eq('room_id', filters.roomId)
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }
  if (filters?.orderBy === 'featured') {
    query = query.eq('is_featured', true)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset && filters?.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const orderMap: Record<string, { column: string; ascending: boolean }> = {
    'price-asc': { column: 'base_price', ascending: true },
    'price-desc': { column: 'base_price', ascending: false },
    'featured': { column: 'created_at', ascending: false },
    'newest': { column: 'created_at', ascending: false },
  }
  const order = orderMap[filters?.orderBy ?? ''] ?? { column: 'created_at', ascending: false }
  const { data, error } = await query.order(order.column, { ascending: order.ascending })
  if (error) throw error
  return data
}

export async function getProductBySlug(slug: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      room:rooms(*),
      product_images(*),
      product_variants(
        *,
        product_variant_materials(
          *,
          material:materials(*)
        )
      )
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error) throw error
  return data
}

export async function getFeaturedProducts(limit = 8) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      product_images(*),
      product_variants(id, price, compare_at_price, color, is_default)
    `)
    .eq('status', 'active')
    .eq('is_featured', true)
    .limit(limit)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getNewProducts(limit = 8) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      product_images(*),
      product_variants(id, price, compare_at_price, color, is_default)
    `)
    .eq('status', 'active')
    .eq('is_new', true)
    .limit(limit)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ============================================================================
// Commerce Operations
// ============================================================================

export async function getUserProfile(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getUserAddresses(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })

  if (error) throw error
  return data
}

export async function getUserCart(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('carts')
    .select(`
      *,
      cart_items(
        *,
        variant:product_variants(
          *,
          product:products(id, name, slug),
          product_variant_materials(*, material:materials(name))
        )
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function addToCart(userId: string, variantId: string, quantity = 1) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('add_to_cart', {
    p_user_id: userId,
    p_variant_id: variantId,
    p_quantity: quantity,
  })

  if (error) throw error
  return data
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('update_cart_item_quantity', {
    p_cart_item_id: cartItemId,
    p_quantity: quantity,
  })

  if (error) throw error
  return data
}

export async function removeFromCart(cartItemId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('remove_from_cart', {
    p_cart_item_id: cartItemId,
  })

  if (error) throw error
  return data
}

export async function getUserOrders(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        variant:product_variants(id, name, color)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createOrder(
  userId: string,
  shippingAddress: Record<string, string>,
  paymentMethod: string,
  notes?: string
) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('create_order_from_cart', {
    p_user_id: userId,
    p_shipping_address: shippingAddress,
    p_payment_method: paymentMethod,
    p_notes: notes ?? undefined,
  })

  if (error) throw error
  return data
}

export async function getProductReviews(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles(full_name, avatar_url)
    `)
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getUserWishlist(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      *,
      variant:product_variants(
        *,
        product:products(id, name, slug),
        product_variant_materials(*, material:materials(name))
      )
    `)
    .eq('user_id', userId)

  if (error) throw error
  return data
}

export async function addToWishlist(userId: string, variantId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, variant_id: variantId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeFromWishlist(userId: string, variantId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('variant_id', variantId)

  if (error) throw error
}

export async function getRelatedProducts(
  excludeId: string,
  categoryId?: string | null,
  roomId?: string | null,
  limit = 8
) {
  const supabase = await createServerClient()
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      room:rooms(*),
      product_images(*),
      product_variants(id, price, compare_at_price, color, is_default)
    `)
    .eq('status', 'active')
    .neq('id', excludeId)
    .limit(limit)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  } else if (roomId) {
    query = query.eq('room_id', roomId)
  }

  const { data } = await query.order('created_at', { ascending: false })
  return data ?? []
}

export async function searchProducts(searchQuery: string, limit = 24) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      room:rooms(*),
      product_images(*),
      product_variants(id, price, compare_at_price, color, is_default)
    `)
    .eq('status', 'active')
    .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    .limit(limit)
    .order('created_at', { ascending: false })

  return data ?? []
}
