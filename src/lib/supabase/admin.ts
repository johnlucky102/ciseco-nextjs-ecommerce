import { createClient } from './server'
export { formatVND, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, VALID_NEXT_STATUSES } from '@/lib/admin-constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminProduct {
  id: string
  name: string
  slug: string
  base_price: number
  compare_at_price: number | null
  status: string
  is_featured: boolean
  category_id: string | null
  room_id: string | null
  created_at: string
  updated_at: string
  categories?: { name: string } | null
  rooms?: { name: string } | null
  product_images?: { image_url: string; is_primary: boolean }[]
  _total_stock?: number
}

export interface AdminOrder {
  id: string
  order_number: string
  status: string
  payment_status: string
  total: number
  currency: string
  created_at: string
  shipping_full_name: string | null
  shipping_phone: string | null
  shipping_city: string | null
  notes: string | null
  profiles?: { full_name: string | null; email: string | null } | null
}

export interface AdminOrderDetail extends AdminOrder {
  subtotal: number
  shipping_cost: number
  tax: number
  shipping_address_line1: string | null
  shipping_address_line2: string | null
  shipping_state_province: string | null
  shipping_country: string | null
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  payment_method: string | null
  order_items: {
    id: string
    product_name: string
    variant_name: string | null
    price: number
    quantity: number
    total: number
  }[]
  order_status_events: {
    id: string
    from_status: string | null
    to_status: string
    note: string | null
    created_at: string
    actor?: { email: string | null } | null
  }[]
  order_fulfillments: {
    id: string
    scheduled_at: string | null
    delivery_notes: string | null
    team?: { name: string } | null
    vehicle?: { license_plate: string; vehicle_type: string | null } | null
  } | null
}

export interface AdminInventoryItem {
  inventory_id: string
  variant_id: string
  variant_name: string
  sku: string | null
  product_name: string
  product_id: string
  product_slug: string
  quantity: number
  reserved_quantity: number
  available: number
  low_stock_threshold: number
}

export interface DashboardKPI {
  revenue_today: number
  revenue_this_month: number
  orders_pending: number
  orders_confirmed: number
  orders_in_production: number
  orders_ready: number
  orders_shipping: number
  orders_completed_today: number
  total_orders: number
  low_stock_count: number
}

export interface UserWithRole {
  user_id: string
  role: string
  created_at: string
  email?: string
  full_name?: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getAdminDashboardKPI(): Promise<DashboardKPI | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_get_dashboard_kpi')
  if (error) { console.error('getAdminDashboardKPI:', error); return null }
  return data as unknown as DashboardKPI
}

export async function getAdminRecentOrders(limit = 8): Promise<AdminOrder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, total, currency, created_at, shipping_full_name, shipping_phone, shipping_city, notes, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('getAdminRecentOrders:', error); return [] }
  return (data ?? []) as AdminOrder[]
}

export async function getAdminLowStock(): Promise<AdminInventoryItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_low_stock')
    .select('*')
    .limit(10)
  if (error) { console.error('getAdminLowStock:', error); return [] }
  return (data ?? []) as AdminInventoryItem[]
}

export async function getAdminTopProducts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_top_products')
    .select('*')
    .limit(5)
  if (error) { console.error('getAdminTopProducts:', error); return [] }
  return data ?? []
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string
  status?: string
  category_id?: string
  room_id?: string
  page?: number
  pageSize?: number
}

export async function getAdminProducts(filters: ProductFilters = {}) {
  const supabase = await createClient()
  const { search, status, category_id, room_id, page = 1, pageSize = 20 } = filters

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, base_price, compare_at_price, status, is_featured,
      category_id, room_id, created_at, updated_at,
      categories(name),
      rooms(name),
      product_images(image_url, is_primary)
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) query = query.ilike('name', `%${search}%`)
  if (status) query = query.eq('status', status)
  if (category_id) query = query.eq('category_id', category_id)
  if (room_id) query = query.eq('room_id', room_id)

  const { data, error, count } = await query
  if (error) { console.error('getAdminProducts:', error); return { data: [], count: 0 } }
  return { data: (data ?? []) as AdminProduct[], count: count ?? 0 }
}

export async function getAdminProductDetail(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(id, name, slug),
      rooms(id, name, slug),
      product_images(id, image_url, alt_text, sort_order, is_primary),
      product_variants(
        id, name, sku, price, compare_at_price, color, is_default, is_active,
        height, width, depth,
        inventory(quantity, reserved_quantity, low_stock_threshold),
        product_variant_materials(
          id, material_part,
          materials(id, name, slug)
        )
      )
    `)
    .eq('id', id)
    .single()
  if (error) { console.error('getAdminProductDetail:', error); return null }
  return data
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderFilters {
  status?: string
  payment_status?: string
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  pageSize?: number
}

export async function getAdminOrders(filters: OrderFilters = {}) {
  const supabase = await createClient()
  const { status, payment_status, search, date_from, date_to, page = 1, pageSize = 20 } = filters

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, total, currency,
      created_at, shipping_full_name, shipping_phone, shipping_city, notes,
      profiles(full_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (payment_status) query = query.eq('payment_status', payment_status)
  if (search) query = query.or(`order_number.ilike.%${search}%,shipping_phone.ilike.%${search}%,shipping_full_name.ilike.%${search}%`)
  if (date_from) query = query.gte('created_at', date_from)
  if (date_to) query = query.lte('created_at', date_to)

  const { data, error, count } = await query
  if (error) { console.error('getAdminOrders:', error); return { data: [], count: 0 } }
  return { data: (data ?? []) as AdminOrder[], count: count ?? 0 }
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, email),
      order_items(id, product_name, variant_name, price, quantity, total),
      order_status_events(id, from_status, to_status, note, created_at, actor_id),
      order_fulfillments(
        id, scheduled_at, delivery_notes,
        installation_teams(name),
        delivery_vehicles(license_plate, vehicle_type)
      )
    `)
    .eq('id', id)
    .single()
  if (error) { console.error('getAdminOrderDetail:', error); return null }
  return data as AdminOrderDetail
}

export async function getInstallationTeams() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('installation_teams')
    .select('id, name, leader_name, phone, status')
    .eq('status', 'active')
    .order('name')
  return data ?? []
}

export async function getDeliveryVehicles() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('delivery_vehicles')
    .select('id, license_plate, vehicle_type, capacity_kg, status')
    .order('license_plate')
  return data ?? []
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryFilters {
  search?: string
  low_stock?: boolean
  out_of_stock?: boolean
  page?: number
  pageSize?: number
}

export async function getAdminInventory(filters: InventoryFilters = {}) {
  const supabase = await createClient()
  const { search, low_stock, out_of_stock, page = 1, pageSize = 30 } = filters

  let query = supabase
    .from('inventory')
    .select(`
      id, variant_id, quantity, reserved_quantity, low_stock_threshold, last_updated_at,
      product_variants(
        id, name, sku, price, color, is_active,
        products(id, name, slug)
      )
    `, { count: 'exact' })
    .order('last_updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(`product_variants.name.ilike.%${search}%,product_variants.sku.ilike.%${search}%`)
  }
  if (out_of_stock) {
    query = query.eq('quantity', 0)
  } else if (low_stock) {
    query = query.lt('quantity', 10)
  }

  const { data, error, count } = await query
  if (error) { console.error('getAdminInventory:', error); return { data: [], count: 0 } }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getInventoryAdjustments(variantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory_adjustments')
    .select('id, delta, reason, before_quantity, after_quantity, note, created_at, admin_user_id')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

// ─── Roles Management ─────────────────────────────────────────────────────────

export async function getUsersWithRoles(): Promise<UserWithRole[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      user_id, role, created_at,
      profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })
  if (error) { console.error('getUsersWithRoles:', error); return [] }
  return (data ?? []).map((r: any) => ({
    user_id: r.user_id,
    role: r.role,
    created_at: r.created_at,
    email: r.profiles?.email ?? '',
    full_name: r.profiles?.full_name ?? '',
  }))
}

export async function searchUserByEmail(email: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', `%${email}%`)
    .limit(5)
  return data ?? []
}

// ─── Constants re-exported from admin-constants (client-safe) ───────────────
// (already exported via the re-export at the top of file)
