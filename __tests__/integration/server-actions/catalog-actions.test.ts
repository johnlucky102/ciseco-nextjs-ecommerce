/**
 * Integration Tests: Server Actions - Catalog (Product CRUD)
 *
 * Kiểm tra createProduct Server Action:
 * - Mapping FormData → payload chính xác
 * - Bắt unique slug constraint
 * - Bắt foreign key constraint (category/room không tồn tại)
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
  createProduct,
  updateProduct,
  archiveProduct,
  upsertVariants,
  deleteVariant,
  addProductImageUrl,
  deleteProductImage,
  setPrimaryImage,
  getCategories,
  getRooms,
  getMaterials,
} from '@/app/(admin)/admin/actions/catalog'
import { revalidatePath } from 'next/cache'

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe('Server Actions: Catalog - createProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset query builder methods
    mockQB.insert = jest.fn().mockReturnThis()
    mockQB.select = jest.fn().mockReturnThis()
    mockQB.update = jest.fn().mockReturnThis()
    mockQB.delete = jest.fn().mockReturnThis()
    mockQB.eq = jest.fn().mockReturnThis()
    mockQB.order = jest.fn().mockReturnThis()
    mockQB.limit = jest.fn().mockReturnThis()
    mockQB.single = jest.fn().mockResolvedValue({
      data: { id: 'new-product-id', slug: 'test-sofa' },
      error: null,
    })
    // Reset client
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  it('mapping FormData → payload đúng cho sản phẩm nội thất', async () => {
    const formData = new FormData()
    formData.append('name', 'Sofa Hiện Đại 3 Chỗ')
    formData.append('slug', 'sofa-hien-dai-3-cho')
    formData.append('description', 'Sofa cao cấp với vải premium')
    formData.append('short_description', 'Sofa 3 chỗ cao cấp')
    formData.append('base_price', '8500000')
    formData.append('compare_at_price', '9500000')
    formData.append('cost_price', '5000000')
    formData.append('sku', 'SOFA-NEW-001')
    formData.append('category_id', 'cat-uuid-001')
    formData.append('room_id', 'room-uuid-001')
    formData.append('status', 'active')
    formData.append('is_featured', 'true')
    formData.append('is_new', 'true')
    formData.append('meta_title', 'Sofa Hiện Đại')
    formData.append('meta_description', 'Sofa hiện đại cho phòng khách')

    await createProduct(formData)

    expect(mockClient.from).toHaveBeenCalledWith('products')
    expect(mockQB.insert).toHaveBeenCalledWith({
      name: 'Sofa Hiện Đại 3 Chỗ',
      slug: 'sofa-hien-dai-3-cho',
      description: 'Sofa cao cấp với vải premium',
      short_description: 'Sofa 3 chỗ cao cấp',
      base_price: 8500000,
      compare_at_price: 9500000,
      cost_price: 5000000,
      sku: 'SOFA-NEW-001',
      category_id: 'cat-uuid-001',
      room_id: 'room-uuid-001',
      status: 'active',
      is_featured: true,
      is_new: true,
      meta_title: 'Sofa Hiện Đại',
      meta_description: 'Sofa hiện đại cho phòng khách',
    })
  })

  it('xử lý fields optional → null', async () => {
    const formData = new FormData()
    formData.append('name', 'Bàn Đơn')
    formData.append('slug', 'ban-don')
    formData.append('description', 'Bàn gỗ đơn giản')
    formData.append('short_description', 'Bàn gỗ')
    formData.append('base_price', '2000000')
    formData.append('compare_at_price', '')
    formData.append('cost_price', '')
    formData.append('sku', '')
    formData.append('category_id', '')
    formData.append('room_id', '')
    formData.append('status', '')
    formData.append('is_featured', 'false')
    formData.append('is_new', 'false')
    formData.append('meta_title', '')
    formData.append('meta_description', '')

    await createProduct(formData)

    expect(mockQB.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        compare_at_price: null,
        cost_price: null,
        sku: null,
        category_id: null,
        room_id: null,
        status: 'draft',
        is_featured: false,
        is_new: false,
      })
    )
  })

  it('bắt lỗi unique slug constraint', async () => {
    // Giả lập: insert trả về lỗi unique constraint
    mockQB.insert.mockReturnThis()
    mockQB.select.mockReturnThis()
    mockQB.single.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' },
    })

    const formData = new FormData()
    formData.append('name', 'Sofa Trùng')
    formData.append('slug', 'modern-3-seater-sofa') // slug đã tồn tại trong seed
    formData.append('description', 'Test')
    formData.append('short_description', 'Test')
    formData.append('base_price', '1000000')
    formData.append('compare_at_price', '')
    formData.append('cost_price', '')
    formData.append('sku', '')
    formData.append('category_id', '')
    formData.append('room_id', '')
    formData.append('status', 'draft')
    formData.append('is_featured', 'false')
    formData.append('is_new', 'false')
    formData.append('meta_title', '')
    formData.append('meta_description', '')

    const result = await createProduct(formData)
    expect(result.error).toBeDefined()
  })

  it('revalidate path sau khi tạo thành công', async () => {
    mockQB.insert.mockReturnThis()
    mockQB.select.mockReturnThis()
    mockQB.single.mockResolvedValue({
      data: { id: 'new-id', slug: 'test-slug' },
      error: null,
    })

    const formData = new FormData()
    formData.append('name', 'Test Product')
    formData.append('slug', 'test-product')
    formData.append('description', 'Desc')
    formData.append('short_description', 'Short')
    formData.append('base_price', '1000000')
    formData.append('compare_at_price', '')
    formData.append('cost_price', '')
    formData.append('sku', '')
    formData.append('category_id', '')
    formData.append('room_id', '')
    formData.append('status', 'draft')
    formData.append('is_featured', 'false')
    formData.append('is_new', 'false')
    formData.append('meta_title', '')
    formData.append('meta_description', '')

    await createProduct(formData)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
  })
})

// ─── updateProduct ────────────────────────────────────────────────────────────

describe('Server Actions: Catalog - updateProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.update = jest.fn().mockReturnValue(mockQB)
    mockQB.insert = jest.fn().mockReturnValue(mockQB)
    mockQB.select = jest.fn().mockReturnValue(mockQB)
    mockQB.delete = jest.fn().mockReturnValue(mockQB)
    mockQB.eq = jest.fn().mockReturnValue(mockQB)
    mockQB.single = jest.fn().mockResolvedValue({ data: { id: 'v-1' }, error: null })
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  it('gọi update với payload FormData và eq(id)', async () => {
    const formData = new FormData()
    formData.append('name', 'Sofa Cập Nhật')
    formData.append('slug', 'sofa-cap-nhat')
    formData.append('description', 'Mô tả mới')
    formData.append('short_description', 'Ngắn')
    formData.append('base_price', '9000000')
    formData.append('compare_at_price', '')
    formData.append('cost_price', '')
    formData.append('sku', '')
    formData.append('category_id', 'cat-1')
    formData.append('room_id', '')
    formData.append('status', 'active')
    formData.append('is_featured', 'true')
    formData.append('is_new', 'false')
    formData.append('meta_title', '')
    formData.append('meta_description', '')

    const result = await updateProduct('p-1', formData)
    expect(mockClient.from).toHaveBeenCalledWith('products')
    expect(mockQB.update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Sofa Cập Nhật',
      base_price: 9000000,
      status: 'active',
    }))
    expect(mockQB.eq).toHaveBeenCalledWith('id', 'p-1')
    expect(result).toEqual({ success: true })
  })

  it('revalidate 2 paths sau khi update', async () => {
    const formData = new FormData()
    formData.append('name', 'X'); formData.append('slug', 'x')
    formData.append('description', 'X'); formData.append('short_description', 'X')
    formData.append('base_price', '1000000'); formData.append('compare_at_price', '')
    formData.append('cost_price', ''); formData.append('sku', '')
    formData.append('category_id', ''); formData.append('room_id', '')
    formData.append('status', 'active'); formData.append('is_featured', 'false')
    formData.append('is_new', 'false'); formData.append('meta_title', '')
    formData.append('meta_description', '')

    await updateProduct('p-1', formData)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p-1/edit')
  })

  it('trả { error } khi update thất bại', async () => {
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: { message: 'update failed' } }))
    const formData = new FormData()
    formData.append('name', 'X'); formData.append('slug', 'x')
    formData.append('description', 'X'); formData.append('short_description', 'X')
    formData.append('base_price', '1000000'); formData.append('compare_at_price', '')
    formData.append('cost_price', ''); formData.append('sku', '')
    formData.append('category_id', ''); formData.append('room_id', '')
    formData.append('status', 'active'); formData.append('is_featured', 'false')
    formData.append('is_new', 'false'); formData.append('meta_title', '')
    formData.append('meta_description', '')

    const result = await updateProduct('p-1', formData)
    expect(result).toEqual({ error: 'update failed' })
  })
})

// ─── archiveProduct ───────────────────────────────────────────────────────────

describe('Server Actions: Catalog - archiveProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.update = jest.fn().mockReturnValue(mockQB)
    mockQB.eq = jest.fn().mockReturnValue(mockQB)
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  it('update status=archived và eq(id)', async () => {
    const result = await archiveProduct('p-1')
    expect(mockQB.update).toHaveBeenCalledWith({ status: 'archived' })
    expect(mockQB.eq).toHaveBeenCalledWith('id', 'p-1')
    expect(result).toEqual({ success: true })
  })

  it('revalidate /admin/products sau khi archive', async () => {
    await archiveProduct('p-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
  })

  it('trả { error } khi thất bại', async () => {
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: { message: 'archive error' } }))
    const result = await archiveProduct('p-1')
    expect(result).toEqual({ error: 'archive error' })
  })
})

// ─── upsertVariants ───────────────────────────────────────────────────────────

describe('Server Actions: Catalog - upsertVariants', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.update = jest.fn().mockReturnValue(mockQB)
    mockQB.insert = jest.fn().mockReturnValue(mockQB)
    mockQB.select = jest.fn().mockReturnValue(mockQB)
    mockQB.delete = jest.fn().mockReturnValue(mockQB)
    mockQB.eq = jest.fn().mockReturnValue(mockQB)
    mockQB.single = jest.fn().mockResolvedValue({ data: { id: 'new-v-id' }, error: null })
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  it('tạo variant mới: insert product_variants + tạo inventory record', async () => {
    const result = await upsertVariants([{
      product_id: 'p-1',
      name: 'Xanh / Gỗ Sồi',
      price: 8500000,
      is_default: true,
      is_active: true,
      initial_stock: 10,
    }])
    expect(mockClient.from).toHaveBeenCalledWith('product_variants')
    expect(mockQB.insert).toHaveBeenCalledWith(expect.objectContaining({ product_id: 'p-1', name: 'Xanh / Gỗ Sồi' }))
    expect(mockQB.single).toHaveBeenCalled()
    expect(mockClient.from).toHaveBeenCalledWith('inventory')
    expect(result).toEqual({ success: true })
  })

  it('tạo variant mới: tạo inventory với initial_stock đúng', async () => {
    await upsertVariants([{
      product_id: 'p-1',
      name: 'Red',
      price: 5000000,
      is_default: false,
      is_active: true,
      initial_stock: 25,
    }])
    expect(mockQB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 25, reserved_quantity: 0 })
    )
  })

  it('update variant đã có: gọi update().eq(id)', async () => {
    await upsertVariants([{
      id: 'existing-v-id',
      product_id: 'p-1',
      name: 'Updated Variant',
      price: 9000000,
      is_default: true,
      is_active: true,
    }])
    expect(mockQB.update).toHaveBeenCalled()
    expect(mockQB.eq).toHaveBeenCalledWith('id', 'existing-v-id')
    expect(mockQB.single).not.toHaveBeenCalled()
  })

  it('sync materials: delete cũ rồi insert mới', async () => {
    await upsertVariants([{
      product_id: 'p-1',
      name: 'Mat Variant',
      price: 5000000,
      is_default: true,
      is_active: true,
      material_ids: ['mat-1', 'mat-2'],
    }])
    expect(mockClient.from).toHaveBeenCalledWith('product_variant_materials')
    expect(mockQB.delete).toHaveBeenCalled()
    expect(mockQB.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ material_id: 'mat-1' }),
        expect.objectContaining({ material_id: 'mat-2' }),
      ])
    )
  })

  it('revalidate /admin/products sau khi upsert', async () => {
    await upsertVariants([{
      product_id: 'p-1', name: 'V1', price: 1000000, is_default: true, is_active: true,
    }])
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
  })

  it('trả { error } khi insert thất bại', async () => {
    mockQB.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'insert error' } })
    const result = await upsertVariants([{
      product_id: 'p-1', name: 'V1', price: 1000000, is_default: true, is_active: true,
    }])
    expect(result).toEqual({ error: 'insert error' })
  })
})

// ─── deleteVariant ────────────────────────────────────────────────────────────

describe('Server Actions: Catalog - deleteVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.delete = jest.fn().mockReturnValue(mockQB)
    mockQB.eq = jest.fn().mockReturnValue(mockQB)
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  it('delete variant theo variantId và revalidate edit page', async () => {
    const result = await deleteVariant('v-1', 'p-1')
    expect(mockClient.from).toHaveBeenCalledWith('product_variants')
    expect(mockQB.delete).toHaveBeenCalled()
    expect(mockQB.eq).toHaveBeenCalledWith('id', 'v-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p-1/edit')
    expect(result).toEqual({ success: true })
  })

  it('trả { error } khi delete thất bại', async () => {
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: { message: 'delete error' } }))
    const result = await deleteVariant('v-1', 'p-1')
    expect(result).toEqual({ error: 'delete error' })
  })
})

// ─── Image Management ─────────────────────────────────────────────────────────

describe('Server Actions: Catalog - Image Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.insert = jest.fn().mockReturnValue(mockQB)
    mockQB.update = jest.fn().mockReturnValue(mockQB)
    mockQB.delete = jest.fn().mockReturnValue(mockQB)
    mockQB.eq = jest.fn().mockReturnValue(mockQB)
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  it('addProductImageUrl: insert ảnh với is_primary flag', async () => {
    const result = await addProductImageUrl('p-1', 'https://storage/img.jpg', true)
    expect(mockClient.from).toHaveBeenCalledWith('product_images')
    expect(mockQB.insert).toHaveBeenCalledWith({
      product_id: 'p-1',
      image_url: 'https://storage/img.jpg',
      is_primary: true,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p-1/edit')
    expect(result).toEqual({ success: true })
  })

  it('addProductImageUrl: isPrimary mặc định false', async () => {
    await addProductImageUrl('p-1', 'https://storage/img2.jpg')
    expect(mockQB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_primary: false })
    )
  })

  it('deleteProductImage: delete theo imageId', async () => {
    const result = await deleteProductImage('img-1', 'p-1')
    expect(mockClient.from).toHaveBeenCalledWith('product_images')
    expect(mockQB.delete).toHaveBeenCalled()
    expect(mockQB.eq).toHaveBeenCalledWith('id', 'img-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p-1/edit')
    expect(result).toEqual({ success: true })
  })

  it('setPrimaryImage: reset all is_primary=false rồi set imageId=true', async () => {
    const result = await setPrimaryImage('img-1', 'p-1')
    const updateCalls = mockQB.update.mock.calls
    expect(updateCalls[0]).toEqual([{ is_primary: false }])
    expect(updateCalls[1]).toEqual([{ is_primary: true }])
    expect(mockQB.eq).toHaveBeenCalledWith('product_id', 'p-1')
    expect(mockQB.eq).toHaveBeenCalledWith('id', 'img-1')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p-1/edit')
    expect(result).toEqual({ success: true })
  })
})

// ─── Lookup helpers: getCategories, getRooms, getMaterials ────────────────────────

describe('Server Actions: Catalog - Lookup helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQB.select = jest.fn().mockReturnValue(mockQB)
    mockQB.eq = jest.fn().mockReturnValue(mockQB)
    mockQB.order = jest.fn().mockReturnValue(mockQB)
    mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
    mockClient.from = jest.fn().mockReturnValue(mockQB)
  })

  describe('getCategories', () => {
    it('query categories với is_active=true và order name', async () => {
      const cats = [{ id: 'c1', name: 'Phòng Khách', slug: 'phong-khach' }]
      mockQB.then = jest.fn((resolve) => resolve({ data: cats, error: null }))
      const result = await getCategories()
      expect(mockClient.from).toHaveBeenCalledWith('categories')
      expect(mockQB.select).toHaveBeenCalledWith('id, name, slug')
      expect(mockQB.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQB.order).toHaveBeenCalledWith('name')
      expect(result).toEqual(cats)
    })

    it('data = null → trả []', async () => {
      mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
      const result = await getCategories()
      expect(result).toEqual([])
    })
  })

  describe('getRooms', () => {
    it('query rooms với is_active=true và order name', async () => {
      const rooms = [{ id: 'r1', name: 'Phòng ngủ', slug: 'phong-ngu' }]
      mockQB.then = jest.fn((resolve) => resolve({ data: rooms, error: null }))
      const result = await getRooms()
      expect(mockClient.from).toHaveBeenCalledWith('rooms')
      expect(mockQB.select).toHaveBeenCalledWith('id, name, slug')
      expect(mockQB.eq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(rooms)
    })

    it('data = null → trả []', async () => {
      mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
      const result = await getRooms()
      expect(result).toEqual([])
    })
  })

  describe('getMaterials', () => {
    it('query materials với is_active=true, select có material_type', async () => {
      const mats = [{ id: 'm1', name: 'Gỗ Sồi', slug: 'go-soi', material_type: 'wood' }]
      mockQB.then = jest.fn((resolve) => resolve({ data: mats, error: null }))
      const result = await getMaterials()
      expect(mockClient.from).toHaveBeenCalledWith('materials')
      expect(mockQB.select).toHaveBeenCalledWith('id, name, slug, material_type')
      expect(mockQB.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQB.order).toHaveBeenCalledWith('name')
      expect(result).toEqual(mats)
    })

    it('data = null → trả []', async () => {
      mockQB.then = jest.fn((resolve) => resolve({ data: null, error: null }))
      const result = await getMaterials()
      expect(result).toEqual([])
    })
  })
})
