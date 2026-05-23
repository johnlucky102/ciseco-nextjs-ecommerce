/**
 * Real-DB Test: Commerce Data Layer — db.ts
 *
 * Verifies commerce profile, cart, order, address, and wishlist operations against local Supabase.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
  createTestAddress,
  addToCart as helperAddToCart,
} from '../setup/seed-helpers'

// Mock revalidatePath to avoid Next.js environment crashes in node testing
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// Mock cookies for Server Actions token loading
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: () => null,
    set: () => {},
  })),
}))

// Replace supabase server client constructor to return our custom authenticated client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => {
    const { client } = clientForUser(user.id, user.email)
    return Promise.resolve(client)
  }),
}))

import {
  getUserProfile,
  getUserAddresses,
  getUserCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  getUserOrders,
  createOrder,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
} from '@/lib/supabase/db'

let user: { id: string; email: string }
let product: { productId: string; variantId: string; inventoryId: string }
let addressId: string

beforeAll(async () => {
  user = await createTestUser('commerce-dl')
  product = await createTestProduct('active', 50)
  addressId = await createTestAddress(user.id, true)
})

afterAll(async () => {
  await deleteTestProduct(product.productId)
  await deleteTestUser(user.id)
})

describe('Commerce Data Layer — Real-DB', () => {
  it('getUserProfile fetches correct profile', async () => {
    const profile = await getUserProfile(user.id)
    expect(profile).toBeDefined()
    expect(profile.id).toBe(user.id)
    expect(profile.email).toBe(user.email)
  })

  it('getUserAddresses returns addresses ordered by default', async () => {
    // Add another non-default address
    await createTestAddress(user.id, false)

    const addresses = await getUserAddresses(user.id)
    expect(addresses.length).toBe(2)
    expect(addresses[0].is_default).toBe(true)
  })

  it('Cart full flow: addToCart → getUserCart → updateCartItemQuantity → removeFromCart', async () => {
    const { client } = clientForUser(user.id, user.email)

    // Add item using lib
    const cartItemId = await addToCart(user.id, product.variantId, 2)
    expect(cartItemId).toBeDefined()

    // Get cart
    const cart = await getUserCart(user.id)
    expect(cart).toBeDefined()
    expect(cart.cart_items.length).toBe(1)
    expect(cart.cart_items[0].variant_id).toBe(product.variantId)
    expect(cart.cart_items[0].quantity).toBe(2)

    // Update quantity
    const updated = await updateCartItemQuantity(cartItemId, 5)
    expect(updated).toBe(true)

    const cartUpdated = await getUserCart(user.id)
    expect(cartUpdated.cart_items[0].quantity).toBe(5)

    // Remove from cart
    const removed = await removeFromCart(cartItemId)
    expect(removed).toBe(true)

    const cartEmpty = await getUserCart(user.id)
    expect(cartEmpty.cart_items.length).toBe(0)
  })

  it('Wishlist flow: addToWishlist → getUserWishlist → removeFromWishlist', async () => {
    const added = await addToWishlist(user.id, product.variantId)
    expect(added).toBeDefined()
    expect(added.variant_id).toBe(product.variantId)

    const wishlist = await getUserWishlist(user.id)
    expect(wishlist.length).toBe(1)
    expect(wishlist[0].variant_id).toBe(product.variantId)

    await removeFromWishlist(user.id, product.variantId)

    const wishlistEmpty = await getUserWishlist(user.id)
    expect(wishlistEmpty.length).toBe(0)
  })

  it('createOrder and getUserOrders workflows', async () => {
    const { client } = clientForUser(user.id, user.email)

    // Seed cart item for checkout
    await helperAddToCart(client, user.id, product.variantId, 1)

    const { data: address } = await (adminClient() as any)
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .single()

    const shippingAddress = {
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      city: address.city,
      country: address.country,
    }

    const orderId = await createOrder(user.id, shippingAddress, 'cod', 'Some order notes')
    expect(orderId).toBeDefined()

    const orders = await getUserOrders(user.id)
    expect(orders.length).toBeGreaterThan(0)
    expect(orders.some((o: any) => o.id === orderId)).toBe(true)
  })
})
