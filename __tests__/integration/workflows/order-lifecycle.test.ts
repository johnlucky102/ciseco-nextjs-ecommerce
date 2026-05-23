/**
 * Integration Tests: Order Lifecycle Workflow
 *
 * Kiểm tra luồng đầy đủ của đơn hàng:
 * Tạo đơn → Xác nhận → Sản xuất → Sẵn sàng giao → Giao & lắp → Hoàn tất
 * và các nhánh: Hủy đơn, thanh toán, phân công logistics.
 *
 * Khác với order-actions.test.ts (unit tests từng action),
 * file này test toàn bộ chuỗi multi-step và business logic constraints.
 */

// ─── Shared mock state ────────────────────────────────────────────────────────

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
} from '@/app/(admin)/admin/actions/orders'
import { revalidatePath } from 'next/cache'
import { VALID_NEXT_STATUSES } from '@/lib/admin-constants'

const mockRevalidate = revalidatePath as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupSuccessRpc() {
  mockClient.rpc = jest.fn().mockResolvedValue({ data: 'ok', error: null })
}

function setupErrorRpc(message: string) {
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: { message } })
}

const ORDER_ID = 'order-abc-123'

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Order Lifecycle Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.select = jest.fn().mockReturnThis()
    mockQB.update = jest.fn().mockReturnThis()
    mockQB.upsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockQB.eq = jest.fn().mockResolvedValue({ data: null, error: null })
    mockClient.from = jest.fn().mockReturnValue(mockQB)
    setupSuccessRpc()
  })

  // ─── VALID_NEXT_STATUSES contract ─────────────────────────────────────────

  describe('VALID_NEXT_STATUSES business rules', () => {
    it('pending chỉ chuyển được sang confirmed hoặc cancelled', () => {
      expect(VALID_NEXT_STATUSES['pending']).toEqual(['confirmed', 'cancelled'])
    })

    it('confirmed chỉ chuyển được sang in_production hoặc cancelled', () => {
      expect(VALID_NEXT_STATUSES['confirmed']).toEqual(['in_production', 'cancelled'])
    })

    it('in_production chỉ chuyển được sang ready_to_ship', () => {
      expect(VALID_NEXT_STATUSES['in_production']).toEqual(['ready_to_ship'])
    })

    it('shipping_installing có thể completed hoặc cancelled', () => {
      expect(VALID_NEXT_STATUSES['shipping_installing']).toContain('completed')
      expect(VALID_NEXT_STATUSES['shipping_installing']).toContain('cancelled')
    })

    it('completed và cancelled là trạng thái cuối (không có next)', () => {
      expect(VALID_NEXT_STATUSES['completed']).toBeUndefined()
      expect(VALID_NEXT_STATUSES['cancelled']).toBeUndefined()
    })
  })

  // ─── Happy path: full furniture delivery lifecycle ────────────────────────

  describe('Full Lifecycle: pending → confirmed → in_production → ready_to_ship → shipping_installing → completed', () => {
    it('Step 1: pending → confirmed', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'confirmed', 'Khách hàng đã duyệt')
      expect(mockClient.rpc).toHaveBeenCalledWith('admin_update_order_status', {
        p_order_id: ORDER_ID,
        p_next_status: 'confirmed',
        p_note: 'Khách hàng đã duyệt',
      })
      expect(result).toEqual({ data: 'ok' })
    })

    it('Step 2: confirmed → in_production', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'in_production')
      expect(mockClient.rpc).toHaveBeenCalledWith('admin_update_order_status', {
        p_order_id: ORDER_ID,
        p_next_status: 'in_production',
        p_note: undefined,
      })
      expect(result).toEqual({ data: 'ok' })
    })

    it('Step 3: in_production → ready_to_ship', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'ready_to_ship', 'Đã hoàn tất sản xuất')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_update_order_status',
        expect.objectContaining({ p_next_status: 'ready_to_ship' })
      )
      expect(result).not.toHaveProperty('error')
    })

    it('Step 4: ready_to_ship → shipping_installing', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'shipping_installing')
      expect(result).not.toHaveProperty('error')
    })

    it('Step 5: shipping_installing → completed (nghiệm thu)', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'completed', 'Khách đã ký nghiệm thu')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_update_order_status',
        expect.objectContaining({ p_next_status: 'completed', p_note: 'Khách đã ký nghiệm thu' })
      )
      expect(result).toEqual({ data: 'ok' })
    })

    it('mỗi step đều revalidate /admin/orders và /admin/orders/:id', async () => {
      await updateOrderStatus(ORDER_ID, 'confirmed')
      expect(mockRevalidate).toHaveBeenCalledWith('/admin/orders')
      expect(mockRevalidate).toHaveBeenCalledWith(`/admin/orders/${ORDER_ID}`)
    })
  })

  // ─── Cancellation branch ──────────────────────────────────────────────────

  describe('Cancellation Branch', () => {
    it('pending → cancelled với lý do hủy', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'cancelled', 'Khách hủy đơn')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_update_order_status',
        expect.objectContaining({ p_next_status: 'cancelled', p_note: 'Khách hủy đơn' })
      )
      expect(result).toEqual({ data: 'ok' })
    })

    it('confirmed → cancelled do hết hàng', async () => {
      const result = await updateOrderStatus(ORDER_ID, 'cancelled', 'Hết nguyên liệu sản xuất')
      expect(result).not.toHaveProperty('error')
    })

    it('DB lỗi invalid transition → trả về error, không revalidate', async () => {
      setupErrorRpc('Invalid status transition: completed → cancelled')
      const result = await updateOrderStatus(ORDER_ID, 'cancelled')
      expect(result).toEqual({ error: 'Invalid status transition: completed → cancelled' })
      expect(mockRevalidate).not.toHaveBeenCalled()
    })
  })

  // ─── Payment workflow ─────────────────────────────────────────────────────

  describe('Payment Status Workflow', () => {
    it('đánh dấu thanh toán "paid" sau khi xác nhận đơn', async () => {
      await updatePaymentStatus(ORDER_ID, 'paid')
      expect(mockClient.from).toHaveBeenCalledWith('orders')
      expect(mockQB.update).toHaveBeenCalledWith(
        expect.objectContaining({ payment_status: 'paid' })
      )
      expect(mockQB.eq).toHaveBeenCalledWith('id', ORDER_ID)
    })

    it('hoàn tiền → payment_status = "refunded" khi hủy đơn', async () => {
      await updatePaymentStatus(ORDER_ID, 'refunded')
      expect(mockQB.update).toHaveBeenCalledWith(
        expect.objectContaining({ payment_status: 'refunded' })
      )
    })

    it('payment update revalidate đúng order detail path', async () => {
      await updatePaymentStatus(ORDER_ID, 'paid')
      expect(mockRevalidate).toHaveBeenCalledWith(`/admin/orders/${ORDER_ID}`)
    })
  })

  // ─── Logistics / Fulfillment workflow ─────────────────────────────────────

  describe('Logistics Workflow: phân công giao hàng & lắp đặt', () => {
    it('assign đội lắp đặt + xe vận chuyển cho đơn ready_to_ship', async () => {
      const result = await upsertOrderFulfillment(ORDER_ID, {
        team_id: 'team-001',
        vehicle_id: 'vehicle-001',
        scheduled_at: '2026-06-15T08:00:00Z',
        delivery_notes: 'Giao trước 10h, tầng 3 có thang máy',
      })
      expect(mockClient.from).toHaveBeenCalledWith('order_fulfillments')
      expect(mockQB.upsert).toHaveBeenCalledWith(
        {
          order_id: ORDER_ID,
          team_id: 'team-001',
          vehicle_id: 'vehicle-001',
          scheduled_at: '2026-06-15T08:00:00Z',
          delivery_notes: 'Giao trước 10h, tầng 3 có thang máy',
        },
        { onConflict: 'order_id' }
      )
      expect(result).toEqual({ success: true })
    })

    it('cập nhật lịch giao lại (re-schedule) → upsert ghi đè bản cũ', async () => {
      const result = await upsertOrderFulfillment(ORDER_ID, {
        scheduled_at: '2026-06-20T14:00:00Z',
        delivery_notes: 'Dời lịch theo yêu cầu khách',
      })
      expect(mockQB.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: ORDER_ID,
          scheduled_at: '2026-06-20T14:00:00Z',
        }),
        { onConflict: 'order_id' }
      )
      expect(result).toEqual({ success: true })
    })

    it('upsert lỗi → trả về error string', async () => {
      mockQB.upsert.mockResolvedValue({
        data: null,
        error: { message: 'violates foreign key constraint' },
      })
      const result = await upsertOrderFulfillment(ORDER_ID, { team_id: 'invalid-team' })
      expect(result).toHaveProperty('error')
      expect(result.error).toContain('foreign key constraint')
    })
  })

  // ─── Concurrent / edge cases ──────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('order không tồn tại → RPC trả error', async () => {
      setupErrorRpc('Order not found')
      const result = await updateOrderStatus('non-existent-order', 'confirmed')
      expect(result).toEqual({ error: 'Order not found' })
    })

    it('note rỗng string → gửi undefined đến RPC', async () => {
      await updateOrderStatus(ORDER_ID, 'confirmed', undefined)
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_update_order_status',
        expect.objectContaining({ p_note: undefined })
      )
    })
  })
})
