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
  getUserProfile,
  getUserAddresses,
  getUserCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  getUserOrders,
  createOrder,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
} from '@/lib/supabase/db'

// ─── Mock setup helper ─────────────────────────────────────────────────────────

function setupMockQB(overrides: { data?: any; error?: any } = {}) {
  const { data = [], error = null } = overrides

  mockQB.select = jest.fn().mockReturnValue(mockQB)
  mockQB.eq = jest.fn().mockReturnValue(mockQB)
  mockQB.neq = jest.fn().mockReturnValue(mockQB)
  mockQB.ilike = jest.fn().mockReturnValue(mockQB)
  mockQB.or = jest.fn().mockReturnValue(mockQB)
  mockQB.in = jest.fn().mockReturnValue(mockQB)
  mockQB.limit = jest.fn().mockReturnValue(mockQB)
  mockQB.range = jest.fn().mockReturnValue(mockQB)
  mockQB.order = jest.fn().mockReturnValue(mockQB)
  mockQB.insert = jest.fn().mockReturnValue(mockQB)
  mockQB.update = jest.fn().mockReturnValue(mockQB)
  mockQB.delete = jest.fn().mockReturnValue(mockQB)
  mockQB.single = jest.fn().mockResolvedValue({ data, error })
  mockQB.then = jest.fn((resolve) => resolve({ data, error }))

  mockClient.from = jest.fn().mockReturnValue(mockQB)
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
}

describe('Commerce Data Layer — db.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMockQB()
  })

  // ─── getUserProfile ───────────────────────────────────────────────────────────

  describe('getUserProfile', () => {
    it('query profile theo userId', async () => {
      const profile = { id: 'user-1', full_name: 'Nguyễn Văn A' }
      mockQB.single = jest.fn().mockResolvedValue({ data: profile, error: null })
      const result = await getUserProfile('user-1')
      expect(mockClient.from).toHaveBeenCalledWith('profiles')
      expect(mockQB.eq).toHaveBeenCalledWith('id', 'user-1')
      expect(mockQB.single).toHaveBeenCalled()
      expect(result).toEqual(profile)
    })

    it('throw error khi user không tồn tại', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'no profile' },
      })
      await expect(getUserProfile('bad-id')).rejects.toMatchObject({ message: 'no profile' })
    })
  })

  // ─── getUserAddresses ─────────────────────────────────────────────────────────

  describe('getUserAddresses', () => {
    it('query addresses theo userId, order is_default desc', async () => {
      const addresses = [
        { id: 'addr-1', is_default: true },
        { id: 'addr-2', is_default: false },
      ]
      setupMockQB({ data: addresses })
      const result = await getUserAddresses('user-1')
      expect(mockClient.from).toHaveBeenCalledWith('addresses')
      expect(mockQB.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQB.order).toHaveBeenCalledWith('is_default', { ascending: false })
      expect(result).toEqual(addresses)
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'addresses error' } })
      await expect(getUserAddresses('user-1')).rejects.toMatchObject({ message: 'addresses error' })
    })
  })

  // ─── getUserCart ──────────────────────────────────────────────────────────────

  describe('getUserCart', () => {
    it('query cart của user với nested cart_items', async () => {
      const cartData = { id: 'cart-1', user_id: 'user-1', cart_items: [] }
      mockQB.single = jest.fn().mockResolvedValue({ data: cartData, error: null })
      const result = await getUserCart('user-1')
      expect(mockClient.from).toHaveBeenCalledWith('carts')
      expect(mockQB.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQB.single).toHaveBeenCalled()
      expect(result).toEqual(cartData)
    })

    it('PGRST116 (no cart) → trả null mà KHÔNG throw', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows returned' },
      })
      const result = await getUserCart('user-1')
      expect(result).toBeNull()
    })

    it('error code khác PGRST116 → throw error', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'connection error' },
      })
      await expect(getUserCart('user-1')).rejects.toMatchObject({ message: 'connection error' })
    })
  })

  // ─── addToCart ────────────────────────────────────────────────────────────────

  describe('addToCart', () => {
    it('gọi RPC add_to_cart với params đúng', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: true, error: null })
      const result = await addToCart('user-1', 'var-1', 2)
      expect(mockClient.rpc).toHaveBeenCalledWith('add_to_cart', {
        p_user_id: 'user-1',
        p_variant_id: 'var-1',
        p_quantity: 2,
      })
      expect(result).toBe(true)
    })

    it('quantity mặc định là 1', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: true, error: null })
      await addToCart('user-1', 'var-1')
      expect(mockClient.rpc).toHaveBeenCalledWith('add_to_cart', expect.objectContaining({
        p_quantity: 1,
      }))
    })

    it('throw error khi RPC lỗi', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rpc error' } })
      await expect(addToCart('user-1', 'var-1')).rejects.toMatchObject({ message: 'rpc error' })
    })
  })

  // ─── updateCartItemQuantity ───────────────────────────────────────────────────

  describe('updateCartItemQuantity', () => {
    it('gọi RPC update_cart_item_quantity với params đúng', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: true, error: null })
      await updateCartItemQuantity('item-1', 3)
      expect(mockClient.rpc).toHaveBeenCalledWith('update_cart_item_quantity', {
        p_cart_item_id: 'item-1',
        p_quantity: 3,
      })
    })

    it('throw error khi RPC lỗi', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'update error' },
      })
      await expect(updateCartItemQuantity('item-1', 3)).rejects.toMatchObject({
        message: 'update error',
      })
    })
  })

  // ─── removeFromCart ───────────────────────────────────────────────────────────

  describe('removeFromCart', () => {
    it('gọi RPC remove_from_cart với cart_item_id', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: true, error: null })
      await removeFromCart('item-1')
      expect(mockClient.rpc).toHaveBeenCalledWith('remove_from_cart', {
        p_cart_item_id: 'item-1',
      })
    })

    it('throw error khi RPC lỗi', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'remove error' } })
      await expect(removeFromCart('item-1')).rejects.toMatchObject({ message: 'remove error' })
    })
  })

  // ─── getUserOrders ────────────────────────────────────────────────────────────

  describe('getUserOrders', () => {
    it('query orders với nested order_items, order created_at desc', async () => {
      const orders = [{ id: 'ord-1', status: 'pending' }]
      setupMockQB({ data: orders })
      const result = await getUserOrders('user-1')
      expect(mockClient.from).toHaveBeenCalledWith('orders')
      expect(mockQB.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(orders)
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'orders error' } })
      await expect(getUserOrders('user-1')).rejects.toMatchObject({ message: 'orders error' })
    })
  })

  // ─── createOrder ──────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    const shippingAddr = { name: 'Nguyễn Văn A', address: '123 Lê Lợi', city: 'HCM' }

    it('gọi RPC create_order_from_cart với đúng params', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: 'new-order-id', error: null })
      const result = await createOrder('user-1', shippingAddr, 'cod')
      expect(mockClient.rpc).toHaveBeenCalledWith('create_order_from_cart', {
        p_user_id: 'user-1',
        p_shipping_address: shippingAddr,
        p_payment_method: 'cod',
        p_notes: undefined,
      })
      expect(result).toBe('new-order-id')
    })

    it('gọi RPC với notes khi được truyền vào', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: 'ord-2', error: null })
      await createOrder('user-1', shippingAddr, 'bank_transfer', 'Giao buổi sáng')
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'create_order_from_cart',
        expect.objectContaining({ p_notes: 'Giao buổi sáng' })
      )
    })

    it('throw error khi RPC lỗi', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'order error' } })
      await expect(createOrder('user-1', shippingAddr, 'cod')).rejects.toMatchObject({
        message: 'order error',
      })
    })
  })

  // ─── getUserWishlist ──────────────────────────────────────────────────────────

  describe('getUserWishlist', () => {
    it('query wishlists của user với nested variant/product/materials', async () => {
      const wishlist = [{ id: 'w-1', variant_id: 'var-1' }]
      setupMockQB({ data: wishlist })
      const result = await getUserWishlist('user-1')
      expect(mockClient.from).toHaveBeenCalledWith('wishlists')
      expect(mockQB.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(result).toEqual(wishlist)
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'wishlist error' } })
      await expect(getUserWishlist('user-1')).rejects.toMatchObject({ message: 'wishlist error' })
    })
  })

  // ─── addToWishlist ────────────────────────────────────────────────────────────

  describe('addToWishlist', () => {
    it('insert wishlist → select → single, trả item được thêm', async () => {
      const newItem = { id: 'w-1', user_id: 'user-1', variant_id: 'var-1' }
      mockQB.single = jest.fn().mockResolvedValue({ data: newItem, error: null })
      const result = await addToWishlist('user-1', 'var-1')
      expect(mockClient.from).toHaveBeenCalledWith('wishlists')
      expect(mockQB.insert).toHaveBeenCalledWith({ user_id: 'user-1', variant_id: 'var-1' })
      expect(mockQB.select).toHaveBeenCalled()
      expect(mockQB.single).toHaveBeenCalled()
      expect(result).toEqual(newItem)
    })

    it('throw error khi đã tồn tại trong wishlist', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      })
      await expect(addToWishlist('user-1', 'var-1')).rejects.toMatchObject({ message: 'duplicate key' })
    })
  })

  // ─── removeFromWishlist ───────────────────────────────────────────────────────

  describe('removeFromWishlist', () => {
    it('delete với 2 eq filters (user_id + variant_id)', async () => {
      setupMockQB({ data: null, error: null })
      await removeFromWishlist('user-1', 'var-1')
      expect(mockClient.from).toHaveBeenCalledWith('wishlists')
      expect(mockQB.delete).toHaveBeenCalled()
      expect(mockQB.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQB.eq).toHaveBeenCalledWith('variant_id', 'var-1')
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'delete error' } })
      await expect(removeFromWishlist('user-1', 'var-1')).rejects.toMatchObject({
        message: 'delete error',
      })
    })
  })
})
