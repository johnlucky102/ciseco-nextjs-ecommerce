// ─── Shared mock state ─────────────────────────────────────────────────────────

const mockQB: any = {}
const mockClient: any = {}

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [], set: () => {} })),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockClient)),
}))

import {
  getAdminDashboardKPI,
  getAdminRecentOrders,
  getAdminLowStock,
  getAdminTopProducts,
  getAdminProducts,
  getAdminProductDetail,
  getAdminOrders,
  getAdminOrderDetail,
  getInstallationTeams,
  getDeliveryVehicles,
  getAdminInventory,
  getInventoryAdjustments,
  getUsersWithRoles,
  searchUserByEmail,
} from '@/lib/supabase/admin'

// ─── Mock setup helper ─────────────────────────────────────────────────────────

function setupMockQB(overrides: { data?: any; error?: any; count?: number } = {}) {
  const { data = [], error = null, count = 0 } = overrides

  mockQB.select = jest.fn().mockReturnValue(mockQB)
  mockQB.eq = jest.fn().mockReturnValue(mockQB)
  mockQB.neq = jest.fn().mockReturnValue(mockQB)
  mockQB.ilike = jest.fn().mockReturnValue(mockQB)
  mockQB.or = jest.fn().mockReturnValue(mockQB)
  mockQB.gte = jest.fn().mockReturnValue(mockQB)
  mockQB.lte = jest.fn().mockReturnValue(mockQB)
  mockQB.lt = jest.fn().mockReturnValue(mockQB)
  mockQB.in = jest.fn().mockReturnValue(mockQB)
  mockQB.limit = jest.fn().mockReturnValue(mockQB)
  mockQB.range = jest.fn().mockReturnValue(mockQB)
  mockQB.order = jest.fn().mockReturnValue(mockQB)
  mockQB.insert = jest.fn().mockReturnValue(mockQB)
  mockQB.update = jest.fn().mockReturnValue(mockQB)
  mockQB.delete = jest.fn().mockReturnValue(mockQB)
  mockQB.single = jest.fn().mockResolvedValue({ data: data === null ? null : (Array.isArray(data) ? null : data), error })
  mockQB.then = jest.fn((resolve) => resolve({ data, error, count }))

  mockClient.from = jest.fn().mockReturnValue(mockQB)
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
}

describe('Admin Data Layer — admin.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMockQB()
  })

  // ─── getAdminDashboardKPI ─────────────────────────────────────────────────────

  describe('getAdminDashboardKPI', () => {
    it('gọi RPC admin_get_dashboard_kpi', async () => {
      const kpi = { revenue_today: 5000000, orders_pending: 3 }
      mockClient.rpc = jest.fn().mockResolvedValue({ data: kpi, error: null })
      const result = await getAdminDashboardKPI()
      expect(mockClient.rpc).toHaveBeenCalledWith('admin_get_dashboard_kpi')
      expect(result).toEqual(kpi)
    })

    it('RPC error → trả null (không throw)', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rpc error' } })
      const result = await getAdminDashboardKPI()
      expect(result).toBeNull()
    })
  })

  // ─── getAdminRecentOrders ─────────────────────────────────────────────────────

  describe('getAdminRecentOrders', () => {
    it('query orders với limit 8 mặc định, order created_at desc', async () => {
      const orders = [{ id: 'ord-1', status: 'pending' }]
      setupMockQB({ data: orders })
      const result = await getAdminRecentOrders()
      expect(mockClient.from).toHaveBeenCalledWith('orders')
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQB.limit).toHaveBeenCalledWith(8)
      expect(result).toEqual(orders)
    })

    it('custom limit', async () => {
      await getAdminRecentOrders(5)
      expect(mockQB.limit).toHaveBeenCalledWith(5)
    })

    it('error → trả [] (không throw)', async () => {
      setupMockQB({ data: null, error: { message: 'DB error' } })
      const result = await getAdminRecentOrders()
      expect(result).toEqual([])
    })
  })

  // ─── getAdminLowStock ─────────────────────────────────────────────────────────

  describe('getAdminLowStock', () => {
    it('query view admin_low_stock với limit 10', async () => {
      setupMockQB({ data: [{ variant_id: 'v-1', quantity: 2 }] })
      const result = await getAdminLowStock()
      expect(mockClient.from).toHaveBeenCalledWith('admin_low_stock')
      expect(mockQB.limit).toHaveBeenCalledWith(10)
      expect(result).toHaveLength(1)
    })

    it('error → trả []', async () => {
      setupMockQB({ error: { message: 'view error' } })
      const result = await getAdminLowStock()
      expect(result).toEqual([])
    })
  })

  // ─── getAdminTopProducts ──────────────────────────────────────────────────────

  describe('getAdminTopProducts', () => {
    it('query view admin_top_products với limit 5', async () => {
      setupMockQB({ data: [{ product_id: 'p-1', total_sold: 10 }] })
      const result = await getAdminTopProducts()
      expect(mockClient.from).toHaveBeenCalledWith('admin_top_products')
      expect(mockQB.limit).toHaveBeenCalledWith(5)
      expect(result).toHaveLength(1)
    })

    it('error → trả []', async () => {
      setupMockQB({ error: { message: 'view error' } })
      const result = await getAdminTopProducts()
      expect(result).toEqual([])
    })
  })

  // ─── getAdminProducts ─────────────────────────────────────────────────────────

  describe('getAdminProducts', () => {
    it('không filter → query products với order + range page 1', async () => {
      setupMockQB({ data: [{ id: 'p-1' }], count: 1 })
      const result = await getAdminProducts()
      expect(mockClient.from).toHaveBeenCalledWith('products')
      expect(mockQB.order).toHaveBeenCalledWith('updated_at', { ascending: false })
      expect(mockQB.range).toHaveBeenCalledWith(0, 19)
      expect(result).toEqual({ data: [{ id: 'p-1' }], count: 1 })
    })

    it('filter search → gọi ilike', async () => {
      await getAdminProducts({ search: 'sofa' })
      expect(mockQB.ilike).toHaveBeenCalledWith('name', '%sofa%')
    })

    it('filter status → gọi eq(status)', async () => {
      await getAdminProducts({ status: 'active' })
      expect(mockQB.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('filter category_id → gọi eq(category_id)', async () => {
      await getAdminProducts({ category_id: 'cat-1' })
      expect(mockQB.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    })

    it('filter room_id → gọi eq(room_id)', async () => {
      await getAdminProducts({ room_id: 'room-1' })
      expect(mockQB.eq).toHaveBeenCalledWith('room_id', 'room-1')
    })

    it('page 2 → range(20, 39)', async () => {
      await getAdminProducts({ page: 2, pageSize: 20 })
      expect(mockQB.range).toHaveBeenCalledWith(20, 39)
    })

    it('error → trả { data: [], count: 0 }', async () => {
      setupMockQB({ error: { message: 'products error' } })
      const result = await getAdminProducts()
      expect(result).toEqual({ data: [], count: 0 })
    })
  })

  // ─── getAdminProductDetail ────────────────────────────────────────────────────

  describe('getAdminProductDetail', () => {
    it('query product theo id với nested relations', async () => {
      const product = { id: 'p-1', name: 'Sofa', product_variants: [] }
      mockQB.single = jest.fn().mockResolvedValue({ data: product, error: null })
      const result = await getAdminProductDetail('p-1')
      expect(mockClient.from).toHaveBeenCalledWith('products')
      expect(mockQB.eq).toHaveBeenCalledWith('id', 'p-1')
      expect(mockQB.single).toHaveBeenCalled()
      expect(result).toEqual(product)
    })

    it('error → trả null (không throw)', async () => {
      mockQB.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      const result = await getAdminProductDetail('bad-id')
      expect(result).toBeNull()
    })
  })

  // ─── getAdminOrders ───────────────────────────────────────────────────────────

  describe('getAdminOrders', () => {
    it('không filter → query orders với order + range', async () => {
      setupMockQB({ data: [{ id: 'ord-1' }], count: 1 })
      const result = await getAdminOrders()
      expect(mockClient.from).toHaveBeenCalledWith('orders')
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQB.range).toHaveBeenCalledWith(0, 19)
      expect(result).toEqual({ data: [{ id: 'ord-1' }], count: 1 })
    })

    it('filter status', async () => {
      await getAdminOrders({ status: 'pending' })
      expect(mockQB.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('filter payment_status', async () => {
      await getAdminOrders({ payment_status: 'unpaid' })
      expect(mockQB.eq).toHaveBeenCalledWith('payment_status', 'unpaid')
    })

    it('filter search → gọi or()', async () => {
      await getAdminOrders({ search: 'Nguyễn' })
      expect(mockQB.or).toHaveBeenCalledWith(expect.stringContaining('Nguyễn'))
    })

    it('filter date_from → gọi gte(created_at)', async () => {
      await getAdminOrders({ date_from: '2024-01-01' })
      expect(mockQB.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
    })

    it('filter date_to → gọi lte(created_at)', async () => {
      await getAdminOrders({ date_to: '2024-12-31' })
      expect(mockQB.lte).toHaveBeenCalledWith('created_at', '2024-12-31')
    })

    it('error → trả { data: [], count: 0 }', async () => {
      setupMockQB({ error: { message: 'orders error' } })
      const result = await getAdminOrders()
      expect(result).toEqual({ data: [], count: 0 })
    })
  })

  // ─── getAdminOrderDetail ──────────────────────────────────────────────────────

  describe('getAdminOrderDetail', () => {
    it('query order theo id với nested fulfillments/events', async () => {
      const orderDetail = { id: 'ord-1', order_items: [], order_status_events: [] }
      mockQB.single = jest.fn().mockResolvedValue({ data: orderDetail, error: null })
      const result = await getAdminOrderDetail('ord-1')
      expect(mockClient.from).toHaveBeenCalledWith('orders')
      expect(mockQB.eq).toHaveBeenCalledWith('id', 'ord-1')
      expect(result).toEqual(orderDetail)
    })

    it('error → trả null', async () => {
      mockQB.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      const result = await getAdminOrderDetail('bad-id')
      expect(result).toBeNull()
    })
  })

  // ─── getInstallationTeams ─────────────────────────────────────────────────────

  describe('getInstallationTeams', () => {
    it('query installation_teams với status=active', async () => {
      setupMockQB({ data: [{ id: 't-1', name: 'Đội A' }] })
      const result = await getInstallationTeams()
      expect(mockClient.from).toHaveBeenCalledWith('installation_teams')
      expect(mockQB.eq).toHaveBeenCalledWith('status', 'active')
      expect(result).toEqual([{ id: 't-1', name: 'Đội A' }])
    })

    it('trả [] khi data null', async () => {
      setupMockQB({ data: null })
      const result = await getInstallationTeams()
      expect(result).toEqual([])
    })
  })

  // ─── getDeliveryVehicles ──────────────────────────────────────────────────────

  describe('getDeliveryVehicles', () => {
    it('query delivery_vehicles với order license_plate', async () => {
      setupMockQB({ data: [{ id: 'v-1', license_plate: '51A-123.45' }] })
      const result = await getDeliveryVehicles()
      expect(mockClient.from).toHaveBeenCalledWith('delivery_vehicles')
      expect(mockQB.order).toHaveBeenCalledWith('license_plate')
      expect(result).toEqual([{ id: 'v-1', license_plate: '51A-123.45' }])
    })
  })

  // ─── getAdminInventory ────────────────────────────────────────────────────────

  describe('getAdminInventory', () => {
    it('không filter → query inventory với order + range', async () => {
      setupMockQB({ data: [{ id: 'inv-1', quantity: 10 }], count: 1 })
      const result = await getAdminInventory()
      expect(mockClient.from).toHaveBeenCalledWith('inventory')
      expect(mockQB.order).toHaveBeenCalledWith('last_updated_at', { ascending: false })
      expect(result.count).toBe(1)
    })

    it('filter out_of_stock → eq(quantity, 0)', async () => {
      await getAdminInventory({ out_of_stock: true })
      expect(mockQB.eq).toHaveBeenCalledWith('quantity', 0)
    })

    it('filter low_stock → lt(quantity, 10)', async () => {
      await getAdminInventory({ low_stock: true })
      expect(mockQB.lt).toHaveBeenCalledWith('quantity', 10)
    })

    it('error → trả { data: [], count: 0 }', async () => {
      setupMockQB({ error: { message: 'inventory error' } })
      const result = await getAdminInventory()
      expect(result).toEqual({ data: [], count: 0 })
    })
  })

  // ─── getInventoryAdjustments ──────────────────────────────────────────────────

  describe('getInventoryAdjustments', () => {
    it('query adjustments theo variantId, limit 20, order created_at desc', async () => {
      setupMockQB({ data: [{ id: 'adj-1', delta: -5 }] })
      const result = await getInventoryAdjustments('var-1')
      expect(mockClient.from).toHaveBeenCalledWith('inventory_adjustments')
      expect(mockQB.eq).toHaveBeenCalledWith('variant_id', 'var-1')
      expect(mockQB.limit).toHaveBeenCalledWith(20)
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual([{ id: 'adj-1', delta: -5 }])
    })

    it('trả [] khi data null', async () => {
      setupMockQB({ data: null })
      const result = await getInventoryAdjustments('var-1')
      expect(result).toEqual([])
    })
  })

  // ─── getUsersWithRoles ────────────────────────────────────────────────────────

  describe('getUsersWithRoles', () => {
    it('query user_roles với join profiles, map flatten', async () => {
      const rawData = [
        {
          user_id: 'u-1',
          role: 'admin',
          created_at: '2024-01-01',
          profiles: { full_name: 'Admin User', email: 'admin@test.com' },
        },
      ]
      setupMockQB({ data: rawData })
      const result = await getUsersWithRoles()
      expect(mockClient.from).toHaveBeenCalledWith('user_roles')
      expect(result).toEqual([
        {
          user_id: 'u-1',
          role: 'admin',
          created_at: '2024-01-01',
          email: 'admin@test.com',
          full_name: 'Admin User',
        },
      ])
    })

    it('profiles null → email và full_name là empty string', async () => {
      const rawData = [{ user_id: 'u-2', role: 'viewer', created_at: '2024-01-02', profiles: null }]
      setupMockQB({ data: rawData })
      const result = await getUsersWithRoles()
      expect(result[0].email).toBe('')
      expect(result[0].full_name).toBe('')
    })

    it('error → trả []', async () => {
      setupMockQB({ error: { message: 'roles error' } })
      const result = await getUsersWithRoles()
      expect(result).toEqual([])
    })
  })

  // ─── searchUserByEmail ────────────────────────────────────────────────────────

  describe('searchUserByEmail', () => {
    it('query profiles với ilike email, limit 5', async () => {
      setupMockQB({ data: [{ id: 'u-1', email: 'test@example.com' }] })
      const result = await searchUserByEmail('test@')
      expect(mockClient.from).toHaveBeenCalledWith('profiles')
      expect(mockQB.ilike).toHaveBeenCalledWith('email', '%test@%')
      expect(mockQB.limit).toHaveBeenCalledWith(5)
      expect(result).toEqual([{ id: 'u-1', email: 'test@example.com' }])
    })

    it('trả [] khi không tìm thấy (data null)', async () => {
      setupMockQB({ data: null })
      const result = await searchUserByEmail('notfound@')
      expect(result).toEqual([])
    })
  })
})
