/**
 * Integration Tests: Server Actions - Order Management
 *
 * Kiểm tra Server Actions gửi đúng payload sang Supabase
 * và bắt được các lỗi constraint/business logic từ database.
 *
 * Strategy: Mock hoàn toàn Supabase + Next.js internals
 */

// ─── Shared mock state ─────────────────────────────────────────────────────────

const mockQB: any = {}
const mockClient: any = {}

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [], set: () => {} })),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockClient)),
}))

import {
  updateOrderStatus,
  upsertOrderFulfillment,
  updatePaymentStatus,
  createInstallationTeam,
  createDeliveryVehicle,
} from '@/app/(admin)/admin/actions/orders'

import { revalidatePath } from 'next/cache'

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe('Server Actions: Order Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset query builder methods
    mockQB.select = jest.fn().mockReturnThis()
    mockQB.insert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockQB.update = jest.fn().mockReturnThis()
    mockQB.upsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockQB.delete = jest.fn().mockReturnThis()
    mockQB.eq = jest.fn().mockResolvedValue({ data: null, error: null })
    mockQB.in = jest.fn().mockReturnThis()
    mockQB.order = jest.fn().mockReturnThis()
    mockQB.limit = jest.fn().mockReturnThis()
    mockQB.single = jest.fn().mockResolvedValue({ data: null, error: null })
    // Reset client methods
    mockClient.from = jest.fn().mockReturnValue(mockQB)
    mockClient.rpc = jest.fn().mockResolvedValue({ data: true, error: null })
  })

  // ─── updateOrderStatus ─────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440000'

    it('gửi đúng params đến RPC admin_update_order_status', async () => {
      await updateOrderStatus(orderId, 'confirmed', 'Đã xác nhận đơn')

      expect(mockClient.rpc).toHaveBeenCalledWith('admin_update_order_status', {
        p_order_id: orderId,
        p_next_status: 'confirmed',
        p_note: 'Đã xác nhận đơn',
      })
    })

    it('gửi p_note undefined khi không có note', async () => {
      await updateOrderStatus(orderId, 'in_production')

      expect(mockClient.rpc).toHaveBeenCalledWith('admin_update_order_status', {
        p_order_id: orderId,
        p_next_status: 'in_production',
        p_note: undefined,
      })
    })

    it('revalidate đúng paths sau khi thành công', async () => {
      await updateOrderStatus(orderId, 'confirmed')

      expect(revalidatePath).toHaveBeenCalledWith('/admin/orders')
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/orders/${orderId}`)
    })

    it('trả về data khi RPC thành công', async () => {
      mockClient.rpc.mockResolvedValue({ data: 'confirmed', error: null })

      const result = await updateOrderStatus(orderId, 'confirmed')
      expect(result).toEqual({ data: 'confirmed' })
    })

    it('bắt lỗi khi chuyển trạng thái không hợp lệ', async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Invalid status transition from pending to completed' },
      })

      const result = await updateOrderStatus(orderId, 'completed')
      expect(result).toEqual({
        error: 'Invalid status transition from pending to completed',
      })
    })

    it('bắt lỗi khi order không tồn tại', async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Order not found' },
      })

      const result = await updateOrderStatus('non-existent-id', 'confirmed')
      expect(result).toEqual({ error: 'Order not found' })
    })
  })

  // ─── upsertOrderFulfillment ────────────────────────────────────────────────

  describe('upsertOrderFulfillment', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440001'
    const payload = {
      team_id: 'team-001',
      vehicle_id: 'vehicle-001',
      scheduled_at: '2026-06-01T09:00:00Z',
      delivery_notes: 'Giao tầng 3, có thang máy',
    }

    it('gửi đúng payload khi upsert fulfillment', async () => {
      await upsertOrderFulfillment(orderId, payload)

      expect(mockClient.from).toHaveBeenCalledWith('order_fulfillments')
      expect(mockQB.upsert).toHaveBeenCalledWith(
        { order_id: orderId, ...payload },
        { onConflict: 'order_id' }
      )
    })

    it('revalidate path sau khi thành công', async () => {
      await upsertOrderFulfillment(orderId, payload)

      expect(revalidatePath).toHaveBeenCalledWith(`/admin/orders/${orderId}`)
    })

    it('trả về success khi upsert thành công', async () => {
      const result = await upsertOrderFulfillment(orderId, payload)
      expect(result).toEqual({ success: true })
    })

    it('bắt lỗi FK constraint khi team_id không tồn tại', async () => {
      mockQB.upsert.mockResolvedValue({
        data: null,
        error: {
          code: '23503',
          message: 'insert or update on table "order_fulfillments" violates foreign key constraint "order_fulfillments_team_id_fkey"',
        },
      })

      const result = await upsertOrderFulfillment(orderId, { team_id: 'non-existent' })
      expect(result.error).toContain('foreign key constraint')
    })
  })

  // ─── updatePaymentStatus ───────────────────────────────────────────────────

  describe('updatePaymentStatus', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440002'

    it('gửi đúng payment_status đến orders table', async () => {
      // Mock the chained query: .from().update().eq()
      mockQB.eq.mockResolvedValue({ data: null, error: null })

      await updatePaymentStatus(orderId, 'paid')

      expect(mockClient.from).toHaveBeenCalledWith('orders')
      expect(mockQB.update).toHaveBeenCalledWith(
        expect.objectContaining({ payment_status: 'paid' })
      )
      expect(mockQB.eq).toHaveBeenCalledWith('id', orderId)
    })

    it('revalidate path sau khi cập nhật thanh toán', async () => {
      mockQB.eq.mockResolvedValue({ data: null, error: null })

      await updatePaymentStatus(orderId, 'paid')
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/orders/${orderId}`)
    })
  })

  // ─── createInstallationTeam ────────────────────────────────────────────────

  describe('createInstallationTeam', () => {
    it('gửi đúng dữ liệu team từ FormData', async () => {
      const formData = new FormData()
      formData.append('name', 'Đội lắp đặt A')
      formData.append('leader_name', 'Nguyễn Văn A')
      formData.append('phone', '0901234567')

      await createInstallationTeam(formData)

      expect(mockClient.from).toHaveBeenCalledWith('installation_teams')
      expect(mockQB.insert).toHaveBeenCalledWith({
        name: 'Đội lắp đặt A',
        leader_name: 'Nguyễn Văn A',
        phone: '0901234567',
      })
    })

    it('xử lý fields trống (leader_name, phone) → null', async () => {
      const formData = new FormData()
      formData.append('name', 'Đội lắp đặt B')
      formData.append('leader_name', '')
      formData.append('phone', '')

      await createInstallationTeam(formData)

      expect(mockQB.insert).toHaveBeenCalledWith({
        name: 'Đội lắp đặt B',
        leader_name: null,
        phone: null,
      })
    })

    it('bắt lỗi unique constraint khi tên team trùng', async () => {
      mockQB.insert.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint "installation_teams_name_key"' },
      })

      const formData = new FormData()
      formData.append('name', 'Đội lắp đặt A')
      formData.append('leader_name', '')
      formData.append('phone', '')

      const result = await createInstallationTeam(formData)
      expect(result.error).toContain('unique constraint')
    })
  })

  // ─── createDeliveryVehicle ─────────────────────────────────────────────────

  describe('createDeliveryVehicle', () => {
    it('gửi đúng dữ liệu xe từ FormData', async () => {
      const formData = new FormData()
      formData.append('license_plate', '51C-12345')
      formData.append('vehicle_type', 'truck')
      formData.append('capacity_kg', '2000')

      await createDeliveryVehicle(formData)

      expect(mockClient.from).toHaveBeenCalledWith('delivery_vehicles')
      expect(mockQB.insert).toHaveBeenCalledWith({
        license_plate: '51C-12345',
        vehicle_type: 'truck',
        capacity_kg: 2000,
      })
    })

    it('capacity_kg null khi không nhập', async () => {
      const formData = new FormData()
      formData.append('license_plate', '51C-99999')
      formData.append('vehicle_type', '')
      formData.append('capacity_kg', '')

      await createDeliveryVehicle(formData)

      expect(mockQB.insert).toHaveBeenCalledWith({
        license_plate: '51C-99999',
        vehicle_type: null,
        capacity_kg: null,
      })
    })
  })
})
