/**
 * Real-DB Test: Inventory Workflow
 *
 * Verifies multi-step operational loops for inventory receiving, damage write-offs,
 * manual stock adjustments, and history logs directly using the local Supabase DB context.
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
import { adjustInventory } from '@/app/(admin)/admin/actions/inventory'

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
  adminUser = await createTestUser('inv-workflow-admin')
  await grantRole(adminUser.id, 'admin')
  product = await createTestProduct('active', 20)
})

afterAll(async () => {
  await deleteTestProduct(product.productId)
  await deleteTestUser(adminUser.id)
})

describe('Inventory Multi-step Operational Workflow — Real-DB', () => {
  it('Operational chain: Receive goods → Write-off damage → Check remaining and audit adjustment logs', async () => {
    // 1. Initial State
    const { quantity: initialQty } = await getInventory(product.variantId)
    expect(initialQty).toBe(20)

    // 2. Receive 50 units (Goods Receipt)
    await adjustInventory(product.variantId, 50, 'import', 'Nhập bổ sung 50 chiếc')
    const { quantity: afterReceive } = await getInventory(product.variantId)
    expect(afterReceive).toBe(70)

    // 3. Write-off 3 damaged units (Damage Waste)
    await adjustInventory(product.variantId, -3, 'damage', 'Phát hiện 3 chiếc bị hỏng')
    const { quantity: afterDamage } = await getInventory(product.variantId)
    expect(afterDamage).toBe(67)

    // 4. Verify audit history contains entries in inventory_adjustments
    const admin = adminClient()
    const { data: logs, error } = await (admin as any)
      .from('inventory_adjustments')
      .select('*')
      .eq('variant_id', product.variantId)
      .order('created_at', { ascending: true })

    expect(error).toBeNull()
    expect(logs.length).toBe(2)

    // 1st import log
    expect(logs[0].delta).toBe(50)
    expect(logs[0].reason).toBe('import')
    expect(logs[0].note).toBe('Nhập bổ sung 50 chiếc')

    // 2nd damage log
    expect(logs[1].delta).toBe(-3)
    expect(logs[1].reason).toBe('damage')
    expect(logs[1].note).toBe('Phát hiện 3 chiếc bị hỏng')
  })
})
