/**
 * Real-DB Test: RLS Cross-User Isolation
 *
 * Targets Bug B1: cancel_order — no ownership check
 * Targets Bug B2: confirm_payment — no ownership check
 *
 * Strategy: Create User A and User B with real Supabase auth.
 * User A tries to access/manipulate User B's data.
 * All operations use real JWT tokens against localhost:54321.
 */

import { clientForUser, anonClient, adminClient } from './setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
  addToCart,
  TestUser,
  TestProduct,
} from './setup/seed-helpers'

let userA: TestUser
let userB: TestUser
let testProduct: TestProduct

beforeAll(async () => {
  userA = await createTestUser('user-a')
  userB = await createTestUser('user-b')
  testProduct = await createTestProduct('active', 20)
})

afterAll(async () => {
  await deleteTestProduct(testProduct.productId)
  await deleteTestUser(userA.id)
  await deleteTestUser(userB.id)
})

// ─── Profile isolation ─────────────────────────────────────────────────────────

describe('Profile RLS isolation', () => {
  it('User A cannot SELECT profile of User B', async () => {
    const { client } = clientForUser(userA.id, userA.email)
    const { data } = await (client as any)
      .from('profiles')
      .select('id, email')
      .eq('id', userB.id)
    expect(data).toHaveLength(0)
  })

  it('User A CAN SELECT their own profile', async () => {
    const { client, userId } = clientForUser(userA.id, userA.email)
    const { data } = await (client as any)
      .from('profiles')
      .select('id')
      .eq('id', userId)
    expect(data).toHaveLength(1)
  })
})

// ─── Cart isolation ────────────────────────────────────────────────────────────

describe('Cart RLS isolation', () => {
  let cartItemIdB: string

  beforeAll(async () => {
    const { client: clientB } = clientForUser(userB.id, userB.email)
    cartItemIdB = await addToCart(clientB, userB.id, testProduct.variantId, 1)
  })

  it("User A cannot SELECT User B's cart_items", async () => {
    const { client: clientB } = clientForUser(userB.id, userB.email)
    const { data: bCart } = await (clientB as any).from('carts').select('id').single()
    const cartIdB = bCart?.id

    const { client } = clientForUser(userA.id, userA.email)
    const { data } = await (client as any)
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartIdB)
    expect(data).toHaveLength(0)
  })
})

// ─── Order isolation ───────────────────────────────────────────────────────────

describe('Order RLS isolation', () => {
  let orderIdB: string

  beforeAll(async () => {
    const { client: clientB } = clientForUser(userB.id, userB.email)
    await addToCart(clientB, userB.id, testProduct.variantId, 1)
    const { data: orderId, error } = await (clientB as any).rpc('create_order_from_cart', {
      p_user_id: userB.id,
      p_shipping_address: {
        full_name: 'User B',
        phone: '0900000001',
        address_line1: '1 Test St',
        city: 'HCM',
        country: 'Vietnam',
      },
      p_payment_method: 'cod',
    })
    if (error) throw new Error(`Failed to create order for User B: ${error.message}`)
    orderIdB = orderId
  })

  it("User A cannot SELECT User B's orders", async () => {
    const { client } = clientForUser(userA.id, userA.email)
    const { data } = await (client as any)
      .from('orders')
      .select('id')
      .eq('id', orderIdB)
    expect(data).toHaveLength(0)
  })

  it("User A cannot SELECT User B's order_items", async () => {
    const { client } = clientForUser(userA.id, userA.email)
    const { data } = await (client as any)
      .from('order_items')
      .select('id')
      .eq('order_id', orderIdB)
    expect(data).toHaveLength(0)
  })

  // ─── BUG B1: cancel_order ownership check ───────────────────────────────────
  it('[BUG B1] User A CANNOT cancel User B\'s order via cancel_order RPC', async () => {
    const { client } = clientForUser(userA.id, userA.email)
    const { data, error } = await (client as any).rpc('cancel_order', {
      p_order_id: orderIdB,
    })
    expect(error).not.toBeNull()
    if (error) {
      console.log('[B1] cancel_order error (expected):', error.message)
    } else {
      console.warn('[B1] *** BUG CONFIRMED ***: cancel_order succeeded without ownership check! data=', data)
    }
  })

  // ─── BUG B2: confirm_payment ownership check ────────────────────────────────
  it('[BUG B2] User A CANNOT confirm payment for User B\'s order via confirm_payment RPC', async () => {
    const { client } = clientForUser(userA.id, userA.email)
    const { data, error } = await (client as any).rpc('confirm_payment', {
      p_order_id: orderIdB,
      p_payment_id: 'fake-txn-001',
      p_payment_gateway: 'test',
    })
    expect(error).not.toBeNull()
    if (error) {
      console.log('[B2] confirm_payment error (expected):', error.message)
    } else {
      console.warn('[B2] *** BUG CONFIRMED ***: confirm_payment succeeded without ownership check! data=', data)
    }
  })
})

// ─── Wishlist isolation ────────────────────────────────────────────────────────

describe('Wishlist RLS isolation', () => {
  beforeAll(async () => {
    const admin = adminClient()
    await (admin as any).from('wishlists').insert({
      user_id: userB.id,
      variant_id: testProduct.variantId,
    })
  })

  it("User A cannot SELECT User B's wishlist", async () => {
    const { client } = clientForUser(userA.id, userA.email)
    const { data } = await (client as any)
      .from('wishlists')
      .select('id')
      .eq('user_id', userB.id)
    expect(data).toHaveLength(0)
  })
})

// ─── Anon access guard ─────────────────────────────────────────────────────────

describe('Unauthenticated access guard', () => {
  it('Anon cannot SELECT any orders', async () => {
    const client = anonClient()
    const { data } = await (client as any).from('orders').select('id')
    expect(data).toHaveLength(0)
  })

  it('Anon cannot SELECT any profiles', async () => {
    const client = anonClient()
    const { data } = await (client as any).from('profiles').select('id')
    expect(data).toHaveLength(0)
  })

  it('Anon cannot SELECT inventory directly', async () => {
    const client = anonClient()
    const { data } = await (client as any).from('inventory').select('id')
    expect(data).toHaveLength(0)
  })
})
