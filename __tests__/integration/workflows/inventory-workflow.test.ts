/**
 * Integration Tests: Inventory Workflow
 *
 * Kiểm tra các luồng nghiệp vụ tồn kho:
 * - Nhập hàng (nhận goods)
 * - Xuất kho / hư hỏng (write-off)
 * - Điều chỉnh tồn kho thực tế (stock-take / kiểm kê)
 * - Chuỗi multi-step: nhận → bán → kiểm tra tồn
 * - Các edge cases: delta=0, tồn kho âm, record không tồn tại
 *
 * Khác với inventory-actions.test.ts (unit tests từng action),
 * file này test toàn bộ chuỗi operational workflows.
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

import { adjustInventory, setInventoryQuantity } from '@/app/(admin)/admin/actions/inventory'
import { revalidatePath } from 'next/cache'

const mockRevalidate = revalidatePath as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupInventoryRecord(quantity: number) {
  mockQB.single = jest.fn().mockResolvedValue({ data: { quantity }, error: null })
}

function setupRpcSuccess() {
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
}

function setupRpcError(message: string) {
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: { message } })
}

const VARIANT_ID = 'variant-sofa-xanh-001'

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Inventory Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.select = jest.fn().mockReturnThis()
    mockQB.eq = jest.fn().mockReturnThis()
    mockQB.single = jest.fn().mockResolvedValue({ data: { quantity: 10 }, error: null })
    mockClient.from = jest.fn().mockReturnValue(mockQB)
    setupRpcSuccess()
  })

  // ─── Nhập hàng (Goods Receipt) ────────────────────────────────────────────

  describe('Nhập hàng (Goods Receipt)', () => {
    it('nhập 50 sản phẩm → gọi RPC với delta=+50 và reason=import', async () => {
      const result = await adjustInventory(VARIANT_ID, 50, 'import', 'Nhập đợt hàng tháng 6')
      expect(mockClient.rpc).toHaveBeenCalledWith('admin_adjust_inventory', {
        p_variant_id: VARIANT_ID,
        p_delta: 50,
        p_reason: 'import',
        p_note: 'Nhập đợt hàng tháng 6',
      })
      expect(result).toEqual({ data: null })
    })

    it('nhập hàng thành công → revalidate /admin/inventory', async () => {
      await adjustInventory(VARIANT_ID, 100, 'import')
      expect(mockRevalidate).toHaveBeenCalledWith('/admin/inventory')
    })

    it('nhập hàng không cần ghi chú → p_note = undefined', async () => {
      await adjustInventory(VARIANT_ID, 20, 'import')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_note: undefined })
      )
    })
  })

  // ─── Xuất kho / Hư hỏng (Write-off) ──────────────────────────────────────

  describe('Xuất kho / Hư hỏng (Write-off)', () => {
    it('ghi nhận 3 sản phẩm hỏng → delta = -3, reason = damage', async () => {
      const result = await adjustInventory(VARIANT_ID, -3, 'damage', 'Hỏng khi vận chuyển')
      expect(mockClient.rpc).toHaveBeenCalledWith('admin_adjust_inventory', {
        p_variant_id: VARIANT_ID,
        p_delta: -3,
        p_reason: 'damage',
        p_note: 'Hỏng khi vận chuyển',
      })
      expect(result).toEqual({ data: null })
    })

    it('tồn kho không đủ → RPC báo lỗi, không revalidate', async () => {
      setupRpcError('Không thể điều chỉnh: tồn kho sẽ âm')
      const result = await adjustInventory(VARIANT_ID, -100, 'adjustment')
      expect(result).toEqual({ error: 'Không thể điều chỉnh: tồn kho sẽ âm' })
      expect(mockRevalidate).not.toHaveBeenCalled()
    })

    it('xuất kho do trưng bày (display) → reason = adjustment', async () => {
      await adjustInventory(VARIANT_ID, -2, 'adjustment', 'Lấy 2 cái làm mẫu trưng bày')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: -2, p_reason: 'adjustment' })
      )
    })
  })

  // ─── Kiểm kê / Điều chỉnh thực tế (Stock-take) ───────────────────────────

  describe('Kiểm kê thực tế (Stock-take via setInventoryQuantity)', () => {
    it('kiểm kê: thực tế có 15, hệ thống ghi 10 → delta = +5', async () => {
      setupInventoryRecord(10)
      const result = await setInventoryQuantity(VARIANT_ID, 15, 'count', 'Kiểm kê Q2/2026')
      expect(mockClient.from).toHaveBeenCalledWith('inventory')
      expect(mockQB.eq).toHaveBeenCalledWith('variant_id', VARIANT_ID)
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: 5 })
      )
      expect(result).toEqual({ data: null })
    })

    it('kiểm kê: thực tế có 7, hệ thống ghi 12 → delta = -5', async () => {
      setupInventoryRecord(12)
      await setInventoryQuantity(VARIANT_ID, 7, 'count')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: -5 })
      )
    })

    it('kiểm kê trùng khớp: thực tế = hệ thống → delta = 0, không gọi RPC', async () => {
      setupInventoryRecord(20)
      const result = await setInventoryQuantity(VARIANT_ID, 20, 'count')
      expect(mockClient.rpc).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('record không tồn tại trong bảng inventory → error, không gọi RPC', async () => {
      mockQB.single = jest.fn().mockResolvedValue({ data: null, error: null })
      const result = await setInventoryQuantity('non-existent-variant', 5, 'count')
      expect(result).toEqual({ error: 'Inventory record not found' })
      expect(mockClient.rpc).not.toHaveBeenCalled()
    })

    it('sau khi kiểm kê thành công → revalidate /admin/inventory', async () => {
      setupInventoryRecord(10)
      await setInventoryQuantity(VARIANT_ID, 15, 'count')
      expect(mockRevalidate).toHaveBeenCalledWith('/admin/inventory')
    })
  })

  // ─── Multi-step scenario: nhận hàng → bán → kiểm kê ─────────────────────

  describe('Multi-step: Nhận hàng → Điều chỉnh → Kiểm kê', () => {
    it('Scenario: nhập 30 → xuất 5 (hư hỏng) → kiểm kê xác nhận 25', async () => {
      // Step 1: nhập 30 đơn vị
      setupRpcSuccess()
      await adjustInventory(VARIANT_ID, 30, 'import', 'Nhập kho tháng 7')
      expect(mockClient.rpc).toHaveBeenLastCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: 30, p_reason: 'import' })
      )

      // Step 2: ghi nhận 5 hỏng
      jest.clearAllMocks()
      setupRpcSuccess()
      mockClient.from = jest.fn().mockReturnValue(mockQB)
      await adjustInventory(VARIANT_ID, -5, 'damage', 'Hỏng do ngập nước')
      expect(mockClient.rpc).toHaveBeenLastCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: -5, p_reason: 'damage' })
      )

      // Step 3: kiểm kê xác nhận còn 25 (hệ thống cũng ghi 25 → delta=0)
      jest.clearAllMocks()
      setupRpcSuccess()
      mockClient.from = jest.fn().mockReturnValue(mockQB)
      setupInventoryRecord(25)
      const result = await setInventoryQuantity(VARIANT_ID, 25, 'count', 'Kiểm kê sau sự cố')
      expect(mockClient.rpc).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('Scenario: kiểm kê phát hiện lệch → RPC điều chỉnh → revalidate', async () => {
      // Hệ thống ghi 30, thực tế chỉ còn 27 (lệch 3)
      setupInventoryRecord(30)
      await setInventoryQuantity(VARIANT_ID, 27, 'count', 'Lệch kho không rõ nguyên nhân')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({
          p_delta: -3,
          p_reason: 'count',
          p_note: 'Lệch kho không rõ nguyên nhân',
        })
      )
      expect(mockRevalidate).toHaveBeenCalledWith('/admin/inventory')
    })
  })
})
