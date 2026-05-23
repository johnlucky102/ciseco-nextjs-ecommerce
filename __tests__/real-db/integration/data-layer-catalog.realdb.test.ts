/**
 * Real-DB Test: Catalog Data Layer — db.ts
 *
 * Verifies the read-only catalog data access functions using local Supabase.
 */

import { anonClient, adminClient as importedAdminClient } from '../setup/db-client'
import {
  createTestCategory,
  createTestRoom,
  createTestMaterial,
  createTestProduct,
  deleteTestProduct,
} from '../setup/seed-helpers'

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

// Replace supabase server client constructor to return our custom public client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => {
    return Promise.resolve(anonClient())
  }),
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

let categoryId: string
let roomId: string
let materialId: string
let product: { productId: string; variantId: string; inventoryId: string }
const ts = Date.now()

beforeAll(async () => {
  categoryId = await createTestCategory(`Sofa IT ${ts}`, `sofa-it-${ts}`)
  roomId = await createTestRoom(`Room IT ${ts}`, `room-it-${ts}`)
  materialId = await createTestMaterial(`Wood IT ${ts}`, `wood-it-${ts}`)
  product = await createTestProduct('active', 25)
  
  // Associate test product with our seeded category and room via direct update
  const { adminClient } = await import('../setup/db-client')
  await (adminClient() as any)
    .from('products')
    .update({ category_id: categoryId, room_id: roomId, is_featured: true, is_new: true })
    .eq('id', product.productId)
})

afterAll(async () => {
  const { adminClient } = await import('../setup/db-client')
  const admin = adminClient()
  await deleteTestProduct(product.productId)
  await (admin as any).from('categories').delete().eq('id', categoryId)
  await (admin as any).from('rooms').delete().eq('id', roomId)
  await (admin as any).from('materials').delete().eq('id', materialId)
})

describe('Catalog Data Layer — Real-DB', () => {
  it('getCategories returns correct structure and active categories', async () => {
    const categories = await getCategories()
    expect(categories.length).toBeGreaterThan(0)
    const testCat = categories.find((c: any) => c.id === categoryId)
    expect(testCat).toBeDefined()
    expect(testCat.slug).toBe(`sofa-it-${ts}`)
  })

  it('getRooms returns correct structure and active rooms', async () => {
    const rooms = await getRooms()
    expect(rooms.length).toBeGreaterThan(0)
    const testRoom = rooms.find((r: any) => r.id === roomId)
    expect(testRoom).toBeDefined()
  })

  it('getMaterials returns active materials', async () => {
    const materials = await getMaterials()
    expect(materials.length).toBeGreaterThan(0)
    const testMat = materials.find((m: any) => m.id === materialId)
    expect(testMat).toBeDefined()
  })

  it('getProducts filters by category and room', async () => {
    const res = await getProducts({ categoryId })
    expect(res.length).toBeGreaterThan(0)
    expect(res[0].id).toBe(product.productId)
  })

  it('getProductBySlug fetches correct product with variants', async () => {
    const { data: prod } = await (importedAdminClient() as any)
      .from('products')
      .select('slug')
      .eq('id', product.productId)
      .single()

    const fetched = await getProductBySlug(prod.slug)
    expect(fetched).toBeDefined()
    expect(fetched.id).toBe(product.productId)
    expect(fetched.product_variants.length).toBeGreaterThan(0)
  })

  it('getFeaturedProducts returns marked products', async () => {
    const featured = await getFeaturedProducts()
    expect(featured.length).toBeGreaterThan(0)
    expect(featured.some((p: any) => p.id === product.productId)).toBe(true)
  })

  it('getNewProducts returns marked products', async () => {
    const news = await getNewProducts()
    expect(news.length).toBeGreaterThan(0)
    expect(news.some((p: any) => p.id === product.productId)).toBe(true)
  })

  it('searchProducts returns matched products', async () => {
    const results = await searchProducts('Test Product')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((p: any) => p.id === product.productId)).toBe(true)
  })

  it('getProductReviews returns empty for seeded product', async () => {
    const reviews = await getProductReviews(product.productId)
    expect(reviews).toEqual([])
  })
})
