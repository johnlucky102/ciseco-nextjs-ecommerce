import { SupabaseClient } from '@supabase/supabase-js'
import { adminClient, clientForUser } from './db-client'

// ─── User helpers ─────────────────────────────────────────────────────────────

export interface TestUser {
  id: string
  email: string
  password: string
}

export async function createTestUser(suffix?: string): Promise<TestUser> {
  const admin = adminClient()
  const ts = Date.now()
  const email = `test-${ts}-${suffix ?? 'user'}@realdb.test`
  const password = 'Test1234!'

  // Use DB-side RPC (direct SQL INSERT into auth.users with bcrypt hash)
  // Bypasses GoTrue admin API which has a bug in this local Supabase version
  const { data, error } = await (admin as any).rpc('create_test_user', {
    p_email: email,
    p_password: password,
  })
  if (error || !data) throw new Error(`createTestUser failed: ${error?.message}`)
  return { id: data as string, email, password }
}

/** Creates a test user and immediately returns a ready-to-use authenticated client */
export async function createTestUserClient(suffix?: string) {
  const user = await createTestUser(suffix)
  const { client, userId } = clientForUser(user.id, user.email)
  return { user, client, userId }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = adminClient()
  // CASCADE on auth.users → profiles handles profile cleanup automatically
  await (admin as any).rpc('delete_test_user_by_id', { p_user_id: userId })
}

// ─── Product / Variant / Inventory helpers ────────────────────────────────────

export interface TestProduct {
  productId: string
  variantId: string
  inventoryId: string
}

export async function createTestProduct(
  status = 'active',
  quantity = 10
): Promise<TestProduct> {
  const admin = adminClient()
  const ts = Date.now()

  const { data: prod, error: pe } = await (admin as any)
    .from('products')
    .insert({
      name: `Test Product ${ts}`,
      slug: `test-product-${ts}`,
      base_price: 1_000_000,
      status,
    })
    .select('id')
    .single()
  if (pe || !prod) throw new Error(`createTestProduct failed: ${pe?.message}`)

  const { data: variant, error: ve } = await (admin as any)
    .from('product_variants')
    .insert({
      product_id: prod.id,
      name: 'Default',
      price: 1_000_000,
      is_default: true,
      is_active: true,
    })
    .select('id')
    .single()
  if (ve || !variant) throw new Error(`createVariant failed: ${ve?.message}`)

  const { data: inv, error: ie } = await (admin as any)
    .from('inventory')
    .insert({
      variant_id: variant.id,
      quantity,
      reserved_quantity: 0,
    })
    .select('id')
    .single()
  if (ie || !inv) throw new Error(`createInventory failed: ${ie?.message}`)

  return { productId: prod.id, variantId: variant.id, inventoryId: inv.id }
}

export async function deleteTestProduct(productId: string): Promise<void> {
  const admin = adminClient()
  await (admin as any).from('products').delete().eq('id', productId)
}

// ─── Cart helpers ─────────────────────────────────────────────────────────────

/**
 * Adds an item to a user's cart using the real RPC.
 * Requires an authenticated client (clientAs()).
 */
export async function addToCart(
  authedClient: SupabaseClient,
  userId: string,
  variantId: string,
  quantity = 1
): Promise<string> {
  const { data, error } = await (authedClient as any).rpc('add_to_cart', {
    p_user_id: userId,
    p_variant_id: variantId,
    p_quantity: quantity,
  })
  if (error) throw new Error(`add_to_cart failed: ${error.message}`)
  return data as string
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

export async function grantRole(userId: string, role: string): Promise<void> {
  const admin = adminClient()
  const { error } = await (admin as any).from('user_roles').insert({ user_id: userId, role })
  if (error) throw new Error(`grantRole(${role}) failed: ${error.message}`)
}

export async function revokeRole(userId: string, role: string): Promise<void> {
  const admin = adminClient()
  await (admin as any)
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)
}

// ─── Inventory read helper ─────────────────────────────────────────────────────

export async function getInventory(
  variantId: string
): Promise<{ quantity: number; reserved_quantity: number }> {
  const admin = adminClient()
  const { data, error } = await (admin as any)
    .from('inventory')
    .select('quantity, reserved_quantity')
    .eq('variant_id', variantId)
    .single()
  if (error || !data) throw new Error(`getInventory failed: ${error?.message}`)
  return data
}

// ─── Catalog master data helpers ──────────────────────────────────────────────

export async function createTestCategory(name = 'Test Sofa Category', slug = 'test-sofas'): Promise<string> {
  const admin = adminClient()
  const { data, error } = await (admin as any)
    .from('categories')
    .insert({ name, slug, is_active: true, sort_order: 1 })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createTestCategory failed: ${error?.message}`)
  return data.id
}

export async function createTestRoom(name = 'Test Living Room', slug = 'test-living-room'): Promise<string> {
  const admin = adminClient()
  const { data, error } = await (admin as any)
    .from('rooms')
    .insert({ name, slug, is_active: true, sort_order: 1 })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createTestRoom failed: ${error?.message}`)
  return data.id
}

export async function createTestMaterial(name = 'Test Oak Wood', slug = 'test-oak-wood', materialType = 'wood'): Promise<string> {
  const admin = adminClient()
  const { data, error } = await (admin as any)
    .from('materials')
    .insert({ name, slug, material_type: materialType, is_active: true })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createTestMaterial failed: ${error?.message}`)
  return data.id
}

// ─── Address helpers ──────────────────────────────────────────────────────────

export async function createTestAddress(userId: string, isDefault = false): Promise<string> {
  const admin = adminClient()
  const ts = Date.now()
  const { data, error } = await (admin as any)
    .from('addresses')
    .insert({
      user_id: userId,
      full_name: `Test Address Recipient ${ts}`,
      phone: '0901234567',
      address_line1: '123 Test Street',
      city: 'Ho Chi Minh',
      postal_code: '70000',
      country: 'Vietnam',
      is_default: isDefault,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createTestAddress failed: ${error?.message}`)
  return data.id
}

// ─── Logistics helpers ────────────────────────────────────────────────────────

export async function createTestInstallationTeam(name = 'Test Team A'): Promise<string> {
  const admin = adminClient()
  const { data, error } = await (admin as any)
    .from('installation_teams')
    .insert({
      name,
      leader_name: 'Test Leader',
      phone: '0908888888',
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createTestInstallationTeam failed: ${error?.message}`)
  return data.id
}

export async function createTestDeliveryVehicle(licensePlate = '51C-77777'): Promise<string> {
  const admin = adminClient()
  const { data, error } = await (admin as any)
    .from('delivery_vehicles')
    .insert({
      license_plate: licensePlate,
      vehicle_type: 'truck',
      capacity_kg: 2000,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`createTestDeliveryVehicle failed: ${error?.message}`)
  return data.id
}

