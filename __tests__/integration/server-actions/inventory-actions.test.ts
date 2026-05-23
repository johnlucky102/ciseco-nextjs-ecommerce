const mockQB: any = {}
const mockClient: any = {}

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [], set: () => {} })),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockClient)),
}))

import { revalidatePath } from 'next/cache'
import { adjustInventory, setInventoryQuantity } from '@/app/(admin)/admin/actions/inventory'

const mockRevalidatePath = revalidatePath as jest.Mock

function setupMockQB(overrides: { data?: any; error?: any } = {}) {
  const { data = null, error = null } = overrides

  mockQB.select = jest.fn().mockReturnValue(mockQB)
  mockQB.eq = jest.fn().mockReturnValue(mockQB)
  mockQB.insert = jest.fn().mockReturnValue(mockQB)
  mockQB.update = jest.fn().mockReturnValue(mockQB)
  mockQB.single = jest.fn().mockResolvedValue({ data, error })
  mockQB.then = jest.fn((resolve) => resolve({ data, error }))

  mockClient.from = jest.fn().mockReturnValue(mockQB)
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
}

describe('Server Actions: Inventory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMockQB()
  })

  // ─── adjustInventory ──────────────────────────────────────────────────────────

  describe('adjustInventory', () => {
    it('gọi RPC admin_adjust_inventory với đúng params', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      const result = await adjustInventory('var-1', -5, 'adjustment', 'Hỏng hóc')
      expect(mockClient.rpc).toHaveBeenCalledWith('admin_adjust_inventory', {
        p_variant_id: 'var-1',
        p_delta: -5,
        p_reason: 'adjustment',
        p_note: 'Hỏng hóc',
      })
      expect(result).toEqual({ data: null })
    })

    it('note là undefined khi không truyền vào', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      await adjustInventory('var-1', 10, 'adjustment')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_note: undefined })
      )
    })

    it('gọi revalidatePath sau khi thành công', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      await adjustInventory('var-1', 5, 'manual')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/inventory')
    })

    it('trả { error } khi RPC thất bại', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Tồn kho không đủ' },
      })
      const result = await adjustInventory('var-1', -100, 'adjustment')
      expect(result).toEqual({ error: 'Tồn kho không đủ' })
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('delta dương (nhập hàng)', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      await adjustInventory('var-1', 50, 'import', 'Nhập hàng mới')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: 50, p_reason: 'import', p_note: 'Nhập hàng mới' })
      )
    })
  })

  // ─── setInventoryQuantity ─────────────────────────────────────────────────────

  describe('setInventoryQuantity', () => {
    it('query current quantity rồi gọi RPC với delta', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: { quantity: 10 },
        error: null,
      })
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      const result = await setInventoryQuantity('var-1', 15, 'manual')
      expect(mockClient.from).toHaveBeenCalledWith('inventory')
      expect(mockQB.eq).toHaveBeenCalledWith('variant_id', 'var-1')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: 5 })
      )
      expect(result).toEqual({ data: null })
    })

    it('delta âm khi set quantity nhỏ hơn hiện tại', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: { quantity: 20 },
        error: null,
      })
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      await setInventoryQuantity('var-1', 8, 'manual')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'admin_adjust_inventory',
        expect.objectContaining({ p_delta: -12 })
      )
    })

    it('delta = 0 khi quantity không thay đổi → early return, không gọi RPC', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: { quantity: 10 },
        error: null,
      })
      const result = await setInventoryQuantity('var-1', 10, 'manual')
      expect(mockClient.rpc).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('inventory không tồn tại → trả error, không gọi RPC', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const result = await setInventoryQuantity('var-not-exist', 5, 'manual')
      expect(result).toEqual({ error: 'Inventory record not found' })
      expect(mockClient.rpc).not.toHaveBeenCalled()
    })

    it('gọi revalidatePath sau khi set thành công', async () => {
      mockQB.single = jest.fn().mockResolvedValue({ data: { quantity: 5 }, error: null })
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      await setInventoryQuantity('var-1', 10, 'manual')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/inventory')
    })
  })
})
