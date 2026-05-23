/**
 * Real-DB Test: Order Lifecycle Workflow
 *
 * Verifies the multi-step order state lifecycle from confirmed → production → shipping → completed,
 * ensuring business policies on state transitions, logistics, and payment updates are locked correctly.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  createTestProduct,
  deleteTestProduct,
  grantRole,
  addToCart,
  createTestInstallationTeam,
  createTestDeliveryVehicle,
} from '../setup/seed-helpers'
import {
  updateOrderStatus,
  upsertOrderFulfillment,
  updatePaymentStatus,
} from '@/app/(admin)/admin/actions/orders'

let adminUser: { id: string; email: string }
let regularUser: { id: string; email: string }
let product: { productId: string; variantId: string; inventoryId: string }
let orderId: string
let teamId: string
let vehicleId: string

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
  adminUser = await createTestUser('order-wf-admin')
  await grantRole(adminUser.id, 'admin')

  regularUser = await createTestUser('order-wf-customer')
  product = await createTestProduct('active', 20)

  // Seed supporting logistics entities
  teamId = await createTestInstallationTeam(`Lifecycle Team ${Date.now()}`)
  vehicleId = await createTestDeliveryVehicle(`51C-IT-${Date.now().toString().slice(-4)}`)

  // Seed initial order
  const { client, userId } = clientForUser(regularUser.id, regularUser.email)
  await addToCart(client, userId, product.variantId, 1)
  const { data: ordId } = await (client as any).rpc('create_order_from_cart', {
    p_user_id: userId,
    p_shipping_address: {
      full_name: 'Workflow Customer',
      phone: '0901112222',
      address_line1: '123 Lifecycle Lane',
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
  await (admin as any).from('installation_teams').delete().eq('id', teamId)
  await (admin as any).from('delivery_vehicles').delete().eq('id', vehicleId)
  await deleteTestProduct(product.productId)
  await deleteTestUser(regularUser.id)
  await deleteTestUser(adminUser.id)
})

describe('Order Lifecycle Workflow Operational loop — Real-DB', () => {
  it('Operational loop: confirmed → in_production → ready_to_ship → shipping_installing → completed', async () => {
    const admin = adminClient()
    const getStatus = async () => {
      const { data } = await (admin as any).from('orders').select('status, payment_status').eq('id', orderId).single()
      return data
    }

    // 1. Initial order state is confirmed (seeded immediately in create_order_from_cart)
    const initial = await getStatus()
    expect(initial.status).toBe('confirmed')
    expect(initial.payment_status).toBe('unpaid')

    // 2. Confirmed → In Production
    const step1 = await updateOrderStatus(orderId, 'in_production', 'Bắt đầu gia công gỗ')
    expect(step1.data).toBeDefined()
    expect(step1.data.success).toBe(true)
    expect((await getStatus()).status).toBe('in_production')

    // 3. In Production → Ready to Ship
    const step2 = await updateOrderStatus(orderId, 'ready_to_ship', 'Lắp ghép khung hoàn tất')
    expect(step2.data).toBeDefined()
    expect(step2.data.success).toBe(true)
    expect((await getStatus()).status).toBe('ready_to_ship')

    // 4. Ready to Ship: Assign logistics (Fulfillment)
    const logistics = await upsertOrderFulfillment(orderId, {
      team_id: teamId,
      vehicle_id: vehicleId,
      scheduled_at: '2026-06-15T09:00:00Z',
      delivery_notes: 'Cẩn thận mặt kính',
    })
    expect(logistics).toEqual({ success: true })

    // Verify order_fulfillments entry
    const { data: fulfillment } = await (admin as any)
      .from('order_fulfillments')
      .select('*')
      .eq('order_id', orderId)
      .single()
    
    expect(fulfillment.team_id).toBe(teamId)
    expect(fulfillment.vehicle_id).toBe(vehicleId)

    // 5. Ready to Ship → Shipping & Installing
    const step3 = await updateOrderStatus(orderId, 'shipping_installing', 'Bắt đầu xếp dỡ lên xe')
    expect(step3.data).toBeDefined()
    expect(step3.data.success).toBe(true)
    expect((await getStatus()).status).toBe('shipping_installing')

    // 6. Update payment status to paid (Customer paid via COD on delivery)
    const pay = await updatePaymentStatus(orderId, 'paid')
    expect(pay).toEqual({ success: true })
    expect((await getStatus()).payment_status).toBe('paid')

    // 7. Shipping & Installing → Completed (Finished installation)
    const step4 = await updateOrderStatus(orderId, 'completed', 'Bàn giao chữ ký nghiệm thu')
    expect(step4.data).toBeDefined()
    expect(step4.data.success).toBe(true)
    expect((await getStatus()).status).toBe('completed')
  })
})
