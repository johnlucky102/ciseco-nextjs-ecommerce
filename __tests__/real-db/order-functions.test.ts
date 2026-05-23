/**
 * Real-DB Test: Order RPC Functions
 *
 * Targets Bug B4: cancel_order uses wrong column for status check
 *   `IF v_order_status != 'paid'` — order status is NEVER 'paid'
 *   (that's payment_status). So this check always passes, always releasing inventory.
 *
 * Targets Bug B5: Race condition in create_order_from_cart
 *   Inventory check and reserve happen in two separate loops with no row-level lock.
 */

import { clientForUser, adminClient as importAdminClient } from './setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
  addToCart,
  getInventory,
  TestUser,
  TestProduct,
} from './setup/seed-helpers'

let user: TestUser
let product: TestProduct

beforeAll(async () => {
  user = await createTestUser('order-fn')
  product = await createTestProduct('active', 10)
})

afterAll(async () => {
  await deleteTestProduct(product.productId)
  await deleteTestUser(user.id)
})

async function createOrder(userObj: TestUser, variantId: string, qty = 1): Promise<string> {
  const { client, userId } = clientForUser(userObj.id, userObj.email)
  await addToCart(client, userId, variantId, qty)
  const { data: orderId, error } = await (client as any).rpc('create_order_from_cart', {
    p_user_id: userId,
    p_shipping_address: {
      full_name: 'Test User',
      phone: '0900123456',
      address_line1: '123 Test St',
      city: 'Ho Chi Minh',
      country: 'Vietnam',
    },
    p_payment_method: 'cod',
  })
  if (error) throw new Error(`create_order_from_cart failed: ${error.message}`)
  return orderId as string
}

// ─── create_order_from_cart ────────────────────────────────────────────────────

describe('create_order_from_cart', () => {
  it('Happy path: creates order and reserves inventory', async () => {
    const { quantity: qBefore, reserved_quantity: rBefore } = await getInventory(product.variantId)
    const orderId = await createOrder(user, product.variantId, 2)
    expect(orderId).toBeTruthy()

    const { reserved_quantity: rAfter } = await getInventory(product.variantId)
    expect(rAfter).toBe(rBefore + 2)
    expect(qBefore).toBe(10)
  })

  it('Empty cart raises exception', async () => {
    const freshUser = await createTestUser('empty-cart')
    try {
      const { client, userId } = clientForUser(freshUser.id, freshUser.email)
      const { error } = await (client as any).rpc('create_order_from_cart', {
        p_user_id: userId,
        p_shipping_address: { full_name: 'X', phone: '0', address_line1: 'X', city: 'X', country: 'VN' },
        p_payment_method: 'cod',
      })
      expect(error).not.toBeNull()
      expect(error.message).toMatch(/cart not found/i)
    } finally {
      await deleteTestUser(freshUser.id)
    }
  })

  it('Insufficient inventory raises exception', async () => {
    const freshUser = await createTestUser('low-stock')
    const lowStockProduct = await createTestProduct('active', 1)
    try {
      const { client, userId } = clientForUser(freshUser.id, freshUser.email)
      await addToCart(client, userId, lowStockProduct.variantId, 5)
      const { error } = await (client as any).rpc('create_order_from_cart', {
        p_user_id: userId,
        p_shipping_address: { full_name: 'X', phone: '0', address_line1: 'X', city: 'X', country: 'VN' },
        p_payment_method: 'cod',
      })
      expect(error).not.toBeNull()
      expect(error.message).toMatch(/insufficient inventory/i)
    } finally {
      await deleteTestProduct(lowStockProduct.productId)
      await deleteTestUser(freshUser.id)
    }
  })

  it('Order status is set to "confirmed" immediately (not "pending")', async () => {
    const freshUser = await createTestUser('status-check')
    const adminCl = importAdminClient()
    try {
      const orderId = await createOrder(freshUser, product.variantId, 1)
      const { data } = await (adminCl as any)
        .from('orders')
        .select('status, payment_status')
        .eq('id', orderId)
        .single()
      expect(data.status).toBe('confirmed')
      expect(data.payment_status).toBe('unpaid')
    } finally {
      await deleteTestUser(freshUser.id)
    }
  })
})

// ─── cancel_order ──────────────────────────────────────────────────────────────

describe('cancel_order', () => {
  it('Owner can cancel their own confirmed order', async () => {
    const orderId = await createOrder(user, product.variantId, 1)
    const { client } = clientForUser(user.id, user.email)
    const { data, error } = await (client as any).rpc('cancel_order', { p_order_id: orderId })
    expect(error).toBeNull()
    expect(data).toBe(true)
  })

  it('Inventory reserved_quantity is released after cancellation', async () => {
    const { reserved_quantity: rBefore } = await getInventory(product.variantId)
    const orderId = await createOrder(user, product.variantId, 1)
    const { reserved_quantity: rAfterOrder } = await getInventory(product.variantId)
    expect(rAfterOrder).toBe(rBefore + 1)

    const { client } = clientForUser(user.id, user.email)
    await (client as any).rpc('cancel_order', { p_order_id: orderId })

    const { reserved_quantity: rAfterCancel } = await getInventory(product.variantId)
    expect(rAfterCancel).toBe(rBefore)
  })

  // ─── BUG B4: Wrong status check in cancel_order ──────────────────────────────
  it('[BUG B4] After confirm_payment, cancel still releases reserved_quantity (double-release risk)', async () => {
    const { quantity: qBefore, reserved_quantity: rBefore } = await getInventory(product.variantId)
    const orderId = await createOrder(user, product.variantId, 1)

    const { client } = clientForUser(user.id, user.email)

    // Simulate payment confirmation
    await (client as any).rpc('confirm_payment', {
      p_order_id: orderId,
      p_payment_id: 'txn-b4-test',
      p_payment_gateway: 'test',
    })

    const { quantity: qAfterPay, reserved_quantity: rAfterPay } = await getInventory(product.variantId)

    // After payment: quantity should decrease, reserved should also decrease
    console.log(`[B4] After confirm_payment: quantity=${qAfterPay} (was ${qBefore}), reserved=${rAfterPay} (was ${rBefore})`)

    // Now cancel the order — the function checks `v_order_status != 'paid'`
    // but order.status is 'confirmed'/'processing', never 'paid'
    // So it will ALWAYS release reserved_quantity even if payment was already done
    await (client as any).rpc('cancel_order', { p_order_id: orderId })

    const { quantity: qAfterCancel, reserved_quantity: rAfterCancel } = await getInventory(product.variantId)
    console.log(`[B4] After cancel_order: quantity=${qAfterCancel}, reserved=${rAfterCancel}`)

    // The bug: if reserved_quantity goes below 0 after cancel, that's a double-release
    if (rAfterCancel < 0) {
      console.warn('[B4] *** BUG CONFIRMED ***: reserved_quantity went negative — double-release due to wrong status check!')
    } else {
      console.log('[B4] reserved_quantity did not go negative — behavior appears correct')
    }
    expect(rAfterCancel).toBeGreaterThanOrEqual(0)
  })

  it('Cannot cancel delivered or already-cancelled order', async () => {
    const admin = importAdminClient()
    const orderId = await createOrder(user, product.variantId, 1)

    // Force order to delivered via service role
    await (admin as any).from('orders').update({ status: 'delivered' }).eq('id', orderId)

    const { client } = clientForUser(user.id, user.email)
    const { error } = await (client as any).rpc('cancel_order', { p_order_id: orderId })
    expect(error).not.toBeNull()
    expect(error.message).toMatch(/cannot cancel/i)
  })
})

// ─── BUG B5: Race condition ────────────────────────────────────────────────────

describe('[BUG B5] Race condition: concurrent orders for last item', () => {
  it('Two users simultaneously ordering the last 1 unit — only one should succeed', async () => {
    const singleUser1 = await createTestUser('race-1')
    const singleUser2 = await createTestUser('race-2')
    const raceProduct = await createTestProduct('active', 1) // Only 1 unit!

    const shippingAddr = {
      full_name: 'Race Test',
      phone: '0900000000',
      address_line1: '1 Race St',
      city: 'HCM',
      country: 'Vietnam',
    }

    try {
      // Both users add to cart simultaneously
      const [c1, c2] = [
        clientForUser(singleUser1.id, singleUser1.email),
        clientForUser(singleUser2.id, singleUser2.email),
      ]

      await Promise.all([
        addToCart(c1.client, c1.userId, raceProduct.variantId, 1),
        addToCart(c2.client, c2.userId, raceProduct.variantId, 1),
      ])

      // Both fire create_order_from_cart concurrently
      const [result1, result2] = await Promise.all([
        (c1.client as any).rpc('create_order_from_cart', {
          p_user_id: c1.userId,
          p_shipping_address: shippingAddr,
          p_payment_method: 'cod',
        }),
        (c2.client as any).rpc('create_order_from_cart', {
          p_user_id: c2.userId,
          p_shipping_address: shippingAddr,
          p_payment_method: 'cod',
        }),
      ])

      const successes = [result1, result2].filter(r => !r.error).length
      const failures = [result1, result2].filter(r => r.error).length

      console.log(`[B5] Race results: ${successes} succeeded, ${failures} failed`)
      if (result1.error) console.log('[B5] result1 error:', result1.error.message)
      if (result2.error) console.log('[B5] result2 error:', result2.error.message)

      if (successes === 2) {
        console.warn('[B5] *** BUG CONFIRMED ***: Both concurrent orders succeeded for 1 unit of stock! Race condition exists.')
        const inv = await getInventory(raceProduct.variantId)
        console.warn(`[B5] inventory after: quantity=${inv.quantity}, reserved=${inv.reserved_quantity}`)
      } else {
        console.log('[B5] Race condition handled correctly: only 1 order succeeded.')
      }

      // At most 1 should succeed
      expect(successes).toBeLessThanOrEqual(1)
    } finally {
      await deleteTestProduct(raceProduct.productId)
      await deleteTestUser(singleUser1.id)
      await deleteTestUser(singleUser2.id)
    }
  })
})
