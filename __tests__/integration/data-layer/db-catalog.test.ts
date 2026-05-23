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
  getCategories,
  getRooms,
  getMaterials,
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  getNewProducts,
  getRelatedProducts,
  searchProducts,
  getProductReviews,
} from '@/lib/supabase/db'

// ─── Mock setup helper ─────────────────────────────────────────────────────────

function setupMockQB(overrides: { data?: any; error?: any; count?: number } = {}) {
  const { data = [], error = null, count = 0 } = overrides

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
  mockQB.single = jest.fn().mockResolvedValue({ data: null, error: null })
  mockQB.then = jest.fn((resolve) => resolve({ data, error, count }))

  mockClient.from = jest.fn().mockReturnValue(mockQB)
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
}

describe('Catalog Data Layer — db.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMockQB()
  })

  // ─── getCategories ────────────────────────────────────────────────────────────

  describe('getCategories', () => {
    it('query bảng categories với is_active=true và order sort_order', async () => {
      setupMockQB({ data: [{ id: '1', name: 'Sofa' }] })
      const result = await getCategories()
      expect(mockClient.from).toHaveBeenCalledWith('categories')
      expect(mockQB.select).toHaveBeenCalledWith('*')
      expect(mockQB.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQB.order).toHaveBeenCalledWith('sort_order', { ascending: true })
      expect(result).toEqual([{ id: '1', name: 'Sofa' }])
    })

    it('throw error khi Supabase trả lỗi', async () => {
      setupMockQB({ data: null, error: { code: '42P01', message: 'table not found' } })
      await expect(getCategories()).rejects.toMatchObject({ message: 'table not found' })
    })
  })

  // ─── getRooms ────────────────────────────────────────────────────────────────

  describe('getRooms', () => {
    it('query bảng rooms với is_active=true và order sort_order', async () => {
      setupMockQB({ data: [{ id: '1', name: 'Phòng khách' }] })
      const result = await getRooms()
      expect(mockClient.from).toHaveBeenCalledWith('rooms')
      expect(mockQB.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQB.order).toHaveBeenCalledWith('sort_order', { ascending: true })
      expect(result).toEqual([{ id: '1', name: 'Phòng khách' }])
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'DB error' } })
      await expect(getRooms()).rejects.toMatchObject({ message: 'DB error' })
    })
  })

  // ─── getMaterials ─────────────────────────────────────────────────────────────

  describe('getMaterials', () => {
    it('query bảng materials với is_active=true và order name', async () => {
      setupMockQB({ data: [{ id: '1', name: 'Gỗ sồi' }] })
      const result = await getMaterials()
      expect(mockClient.from).toHaveBeenCalledWith('materials')
      expect(mockQB.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQB.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result).toEqual([{ id: '1', name: 'Gỗ sồi' }])
    })
  })

  // ─── getProducts ─────────────────────────────────────────────────────────────

  describe('getProducts', () => {
    it('không filter → query products với status=active, order created_at desc', async () => {
      await getProducts()
      expect(mockClient.from).toHaveBeenCalledWith('products')
      expect(mockQB.eq).toHaveBeenCalledWith('status', 'active')
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQB.ilike).not.toHaveBeenCalled()
      expect(mockQB.range).not.toHaveBeenCalled()
    })

    it('filter categoryId → gọi eq(category_id)', async () => {
      await getProducts({ categoryId: 'cat-1' })
      expect(mockQB.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    })

    it('filter roomId → gọi eq(room_id)', async () => {
      await getProducts({ roomId: 'room-1' })
      expect(mockQB.eq).toHaveBeenCalledWith('room_id', 'room-1')
    })

    it('filter search → gọi ilike(name)', async () => {
      await getProducts({ search: 'sofa' })
      expect(mockQB.ilike).toHaveBeenCalledWith('name', '%sofa%')
    })

    it('orderBy price-asc → order base_price ascending', async () => {
      await getProducts({ orderBy: 'price-asc' })
      expect(mockQB.order).toHaveBeenCalledWith('base_price', { ascending: true })
    })

    it('orderBy price-desc → order base_price descending', async () => {
      await getProducts({ orderBy: 'price-desc' })
      expect(mockQB.order).toHaveBeenCalledWith('base_price', { ascending: false })
    })

    it('orderBy featured → filter is_featured=true + order created_at', async () => {
      await getProducts({ orderBy: 'featured' })
      expect(mockQB.eq).toHaveBeenCalledWith('is_featured', true)
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('limit → gọi limit(N)', async () => {
      await getProducts({ limit: 10 })
      expect(mockQB.limit).toHaveBeenCalledWith(10)
    })

    it('offset + limit → gọi range(offset, offset+limit-1)', async () => {
      await getProducts({ offset: 20, limit: 10 })
      expect(mockQB.range).toHaveBeenCalledWith(20, 29)
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'query failed' } })
      await expect(getProducts()).rejects.toMatchObject({ message: 'query failed' })
    })
  })

  // ─── getProductBySlug ─────────────────────────────────────────────────────────

  describe('getProductBySlug', () => {
    it('query sản phẩm theo slug với relations', async () => {
      const productData = { id: 'p-1', name: 'Sofa ABC', slug: 'sofa-abc' }
      mockQB.single = jest.fn().mockResolvedValue({ data: productData, error: null })
      const result = await getProductBySlug('sofa-abc')
      expect(mockClient.from).toHaveBeenCalledWith('products')
      expect(mockQB.eq).toHaveBeenCalledWith('slug', 'sofa-abc')
      expect(mockQB.eq).toHaveBeenCalledWith('status', 'active')
      expect(mockQB.single).toHaveBeenCalled()
      expect(result).toEqual(productData)
    })

    it('throw error khi slug không tồn tại', async () => {
      mockQB.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' },
      })
      await expect(getProductBySlug('not-exist')).rejects.toMatchObject({ message: 'no rows' })
    })
  })

  // ─── getFeaturedProducts ──────────────────────────────────────────────────────

  describe('getFeaturedProducts', () => {
    it('query is_featured=true với limit mặc định 8', async () => {
      setupMockQB({ data: [{ id: 'p-1' }] })
      const result = await getFeaturedProducts()
      expect(mockQB.eq).toHaveBeenCalledWith('is_featured', true)
      expect(mockQB.limit).toHaveBeenCalledWith(8)
      expect(result).toEqual([{ id: 'p-1' }])
    })

    it('query với limit tuỳ chỉnh', async () => {
      await getFeaturedProducts(4)
      expect(mockQB.limit).toHaveBeenCalledWith(4)
    })
  })

  // ─── getNewProducts ───────────────────────────────────────────────────────────

  describe('getNewProducts', () => {
    it('query is_new=true với limit mặc định 8', async () => {
      setupMockQB({ data: [{ id: 'p-2' }] })
      const result = await getNewProducts()
      expect(mockQB.eq).toHaveBeenCalledWith('is_new', true)
      expect(mockQB.limit).toHaveBeenCalledWith(8)
      expect(result).toEqual([{ id: 'p-2' }])
    })
  })

  // ─── getRelatedProducts ───────────────────────────────────────────────────────

  describe('getRelatedProducts', () => {
    it('exclude sản phẩm hiện tại, filter by category nếu có', async () => {
      setupMockQB({ data: [{ id: 'p-3' }] })
      const result = await getRelatedProducts('p-1', 'cat-1', null)
      expect(mockQB.neq).toHaveBeenCalledWith('id', 'p-1')
      expect(mockQB.eq).toHaveBeenCalledWith('category_id', 'cat-1')
      expect(mockQB.limit).toHaveBeenCalledWith(8)
      expect(result).toEqual([{ id: 'p-3' }])
    })

    it('filter by room khi không có category', async () => {
      await getRelatedProducts('p-1', null, 'room-2')
      expect(mockQB.eq).toHaveBeenCalledWith('room_id', 'room-2')
      expect(mockQB.eq).not.toHaveBeenCalledWith('category_id', expect.anything())
    })

    it('trả [] khi không có sản phẩm (data = null)', async () => {
      setupMockQB({ data: null })
      const result = await getRelatedProducts('p-1')
      expect(result).toEqual([])
    })

    it('custom limit', async () => {
      await getRelatedProducts('p-1', null, null, 4)
      expect(mockQB.limit).toHaveBeenCalledWith(4)
    })
  })

  // ─── searchProducts ───────────────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('query or (name ilike + description ilike)', async () => {
      setupMockQB({ data: [{ id: 'p-4', name: 'Sofa' }] })
      const result = await searchProducts('sofa')
      expect(mockQB.or).toHaveBeenCalledWith('name.ilike.%sofa%,description.ilike.%sofa%')
      expect(mockQB.limit).toHaveBeenCalledWith(24)
      expect(result).toEqual([{ id: 'p-4', name: 'Sofa' }])
    })

    it('trả [] khi không tìm thấy (data = null)', async () => {
      setupMockQB({ data: null })
      const result = await searchProducts('xyz-not-exist')
      expect(result).toEqual([])
    })

    it('custom limit', async () => {
      await searchProducts('bàn', 12)
      expect(mockQB.limit).toHaveBeenCalledWith(12)
    })
  })

  // ─── getProductReviews ────────────────────────────────────────────────────────

  describe('getProductReviews', () => {
    it('query reviews với is_approved=true, join profiles', async () => {
      setupMockQB({ data: [{ id: 'r-1', rating: 5 }] })
      const result = await getProductReviews('p-1')
      expect(mockClient.from).toHaveBeenCalledWith('reviews')
      expect(mockQB.eq).toHaveBeenCalledWith('product_id', 'p-1')
      expect(mockQB.eq).toHaveBeenCalledWith('is_approved', true)
      expect(mockQB.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual([{ id: 'r-1', rating: 5 }])
    })

    it('throw error khi Supabase lỗi', async () => {
      setupMockQB({ error: { message: 'reviews error' } })
      await expect(getProductReviews('p-1')).rejects.toMatchObject({ message: 'reviews error' })
    })
  })
})
