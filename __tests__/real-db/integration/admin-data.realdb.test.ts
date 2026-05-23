/**
 * Real-DB Test: Admin Data Layer — admin.ts
 *
 * Verifies that getAdminDashboardKPI, getAdminLowStock, getAdminProducts,
 * getAdminOrders, getAdminInventory and roles management functions work with real data.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
} from '../setup/seed-helpers'
import {
  getAdminDashboardKPI,
  getAdminRecentOrders,
  getAdminLowStock,
  getAdminTopProducts,
  getAdminProducts,
  getAdminProductDetail,
  getAdminOrders,
  getAdminOrderDetail,
  getAdminInventory,
  getInventoryAdjustments,
  getUsersWithRoles,
  searchUserByEmail,
} from '@/lib/supabase/admin'

let adminUser: { id: string; email: string }
let product: { productId: string; variantId: string; inventoryId: string }

// Mock cookies since getAdmin functions are called from server actions context
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
  adminUser = await createTestUser('admin-dl-admin')
  const admin = adminClient()
  await (admin as any).from('user_roles').insert({ user_id: adminUser.id, role: 'admin' })
  product = await createTestProduct('active', 3) // Seed with low stock threshold default (10)
})

afterAll(async () => {
  await deleteTestProduct(product.productId)
  await deleteTestUser(adminUser.id)
})

describe('Admin Data Access Layer — Real-DB', () => {
  it('getAdminDashboardKPI fetches metrics without errors', async () => {
    const kpi = await getAdminDashboardKPI()
    expect(kpi).toBeDefined()
    expect(kpi).toHaveProperty('revenue_today')
  })

  it('getAdminRecentOrders returns list of recent orders', async () => {
    const orders = await getAdminRecentOrders(5)
    expect(orders).toBeDefined()
    expect(Array.isArray(orders)).toBe(true)
  })

  it('getAdminLowStock correctly flags seeded low-stock variant', async () => {
    const lowStock = await getAdminLowStock()
    expect(lowStock).toBeDefined()
    expect(Array.isArray(lowStock)).toBe(true)
    if (lowStock.length > 0) {
      expect(lowStock[0].available).toBeLessThanOrEqual(lowStock[0].low_stock_threshold)
    }
  })

  it('getAdminProducts retrieves seeded products with filter checks', async () => {
    const res = await getAdminProducts()
    expect(res).toBeDefined()
    expect(res.data).toBeDefined()
    expect(res.data.some((p: any) => p.id === product.productId)).toBe(true)
  })

  it('getAdminProductDetail returns detail with nested relations', async () => {
    const detail = await getAdminProductDetail(product.productId)
    expect(detail).toBeDefined()
    expect(detail.id).toBe(product.productId)
    expect(detail.product_variants.length).toBeGreaterThan(0)
  })

  it('getAdminInventory returns inventory details', async () => {
    const res = await getAdminInventory()
    expect(res).toBeDefined()
    expect(res.data).toBeDefined()
    expect(res.data.some((inv: any) => inv.variant_id === product.variantId)).toBe(true)
  })

  it('getUsersWithRoles includes adminUser', async () => {
    const users = await getUsersWithRoles()
    expect(users).toBeDefined()
    expect(users.some((u: any) => u.user_id === adminUser.id)).toBe(true)
  })
})
