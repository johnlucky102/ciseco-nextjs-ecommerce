/**
 * Real-DB Test: Server Actions — Order Logistics & Status
 *
 * Verifies Server Actions that update order statuses, logistics team/vehicle insertions,
 * and logistics fulfillment assignments using direct Supabase database constraints.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
  grantRole,
  addToCart,
} from '../setup/seed-helpers'
import {
  updateOrderStatus,
  upsertOrderFulfillment,
  updatePaymentStatus,
  createInstallationTeam,
  createDeliveryVehicle,
} from '@/app/(admin)/admin/actions/orders'

let adminUser: { id: string; email: string }
let regularUser: { id: string; email: string }
let product: { productId: string; variantId: string; inventoryId: string }
let orderId: string

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
  adminUser = await createTestUser('order-actions-admin')
  await grantRole(adminUser.id, 'admin')

  regularUser = await createTestUser('order-actions-customer')
  product = await createTestProduct('active', 20)

  // Seed an order for test execution
  const { client, userId } = clientForUser(regularUser.id, regularUser.email)
  await addToCart(client, userId, product.variantId, 2)
  const { data: ordId } = await (client as any).rpc('create_order_from_cart', {
    p_user_id: userId,
    p_shipping_address: {
      full_name: 'Regular Customer',
      phone: '0901112222',
      address_line1: '456 Order Lane',
      city: 'Ho Chi Minh',
      country: 'Vietnam',
    },
    p_payment_method: 'cod',
  })
  orderId = ordId
})

afterAll(async () => {
  const admin = adminClient()
  await (admin as any).from('orders').delete().eq('id', orderId)
  await deleteTestProduct(product.productId)
  await deleteTestUser(regularUser.id)
  await deleteTestUser(adminUser.id)
})

describe('Order Server Actions & Constraints — Real-DB', () => {
  it('updateOrderStatus RPC call transitions state successfully', async () => {
    const result = await updateOrderStatus(orderId, 'in_production', 'Admin chuyển sang sản xuất')
    expect(result.data).toBeDefined()
    expect(result.data.success).toBe(true)
    expect(result.data.to).toBe('in_production')

    const admin = adminClient()
    const { data: order } = await (admin as any)
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()
    expect(order.status).toBe('in_production')
  })

  it('updateOrderStatus handles invalid state transition gracefully', async () => {
    // Attempting confirmed -> completed (invalid per VALID_NEXT_STATUSES check in order_functions)
    const result = await updateOrderStatus(orderId, 'completed')
    expect(result).toHaveProperty('error')
  })

  it('createInstallationTeam inserts team successfully (duplicate names allowed due to lack of unique constraint in DB)', async () => {
    const uniqueTeamName = `Đội lắp đặt IT ${Date.now()}`
    const formData = new FormData()
    formData.append('name', uniqueTeamName)
    formData.append('leader_name', 'Nguyễn Trưởng Đội')
    formData.append('phone', '0909999999')

    const result = await createInstallationTeam(formData)
    expect(result).toEqual({ success: true })

    // Clean up team
    const admin = adminClient()
    await (admin as any).from('installation_teams').delete().eq('name', uniqueTeamName)
  })

  it('createDeliveryVehicle inserts vehicle', async () => {
    const uniquePlate = `51C-IT-${Date.now().toString().slice(-5)}`
    const formData = new FormData()
    formData.append('license_plate', uniquePlate)
    formData.append('vehicle_type', 'truck')
    formData.append('capacity_kg', '1500')

    const result = await createDeliveryVehicle(formData)
    expect(result).toEqual({ success: true })

    // Clean up
    const admin = adminClient()
    await (admin as any).from('delivery_vehicles').delete().eq('license_plate', uniquePlate)
  })

  it('upsertOrderFulfillment handles foreign key validation error gracefully', async () => {
    // Attempting fulfillment with invalid team_id / vehicle_id
    const result = await upsertOrderFulfillment(orderId, {
      team_id: '00000000-0000-0000-0000-000000000001',
      vehicle_id: '00000000-0000-0000-0000-000000000002',
      scheduled_at: '2026-06-01T08:00:00Z',
    })

    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/foreign key constraint/i)
  })
})
