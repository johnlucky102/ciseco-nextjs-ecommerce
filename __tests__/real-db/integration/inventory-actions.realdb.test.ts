/**
 * Real-DB Test: Server Actions — Inventory Management
 *
 * Verifies inventory Server Actions (adjustInventory, setInventoryQuantity)
 * directly using the local Supabase DB context under an admin-privileged user.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
  grantRole,
  getInventory,
} from '../setup/seed-helpers'
import { adjustInventory, setInventoryQuantity } from '@/app/(admin)/admin/actions/inventory'

let adminUser: { id: string; email: string }
let product: { productId: string; variantId: string; inventoryId: string }

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
    const { client } = clientForUser(adminUser.id, adminUser.email)
    return Promise.resolve(client)
  }),
}))

beforeAll(async () => {
  adminUser = await createTestUser('inv-actions-admin')
  await grantRole(adminUser.id, 'admin')
  product = await createTestProduct('active', 10)
})

afterAll(async () => {
  await deleteTestProduct(product.productId)
  await deleteTestUser(adminUser.id)
})

describe('Inventory Server Actions — Real-DB', () => {
  it('adjustInventory calls admin_adjust_inventory RPC with correct delta', async () => {
    const result = await adjustInventory(product.variantId, 50, 'import', 'Nhập đợt hàng tháng 6')
    expect(result.data).toBeDefined()
    expect(result.data.success).toBe(true)

    const { quantity } = await getInventory(product.variantId)
    expect(quantity).toBe(60) // 10 initial + 50 imported
  })

  it('adjustInventory fails with insufficient stock write-off', async () => {
    const result = await adjustInventory(product.variantId, -100, 'damage', 'Xuất hao hụt quá mức')
    expect(result).toHaveProperty('error')
    
    // Quantity remains unchanged
    const { quantity } = await getInventory(product.variantId)
    expect(quantity).toBe(60)
  })

  it('setInventoryQuantity adjusts exact delta based on current quantity', async () => {
    // Current quantity is 60. Set to 15. Delta should be -45
    const result = await setInventoryQuantity(product.variantId, 15, 'manual')
    expect(result.data).toBeDefined()
    expect(result.data.success).toBe(true)

    const { quantity } = await getInventory(product.variantId)
    expect(quantity).toBe(15)
  })

  it('setInventoryQuantity returns early when quantity unchanged', async () => {
    // Current is 15. Set to 15 again.
    const result = await setInventoryQuantity(product.variantId, 15, 'manual')
    expect(result).toEqual({ success: true })
  })
})
