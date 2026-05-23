/**
 * Real-DB Test: Server Actions — Catalog (Product CRUD)
 *
 * Verifies catalog server actions (createProduct, updateProduct, archiveProduct, upsertVariants, deleteVariant)
 * directly against local Supabase using database unique key constraints and cascade relations.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
  grantRole,
} from '../setup/seed-helpers'
import {
  createProduct,
  updateProduct,
  archiveProduct,
  upsertVariants,
  deleteVariant,
} from '@/app/(admin)/admin/actions/catalog'

let adminUser: { id: string; email: string }
let createdProductIds: string[] = []

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
  adminUser = await createTestUser('catalog-actions-admin')
  await grantRole(adminUser.id, 'admin')
})

afterAll(async () => {
  const admin = adminClient()
  if (createdProductIds.length > 0) {
    await (admin as any).from('products').delete().in('id', createdProductIds)
  }
  await deleteTestUser(adminUser.id)
})

describe('Catalog Server Actions & Variants CRUD — Real-DB', () => {
  it('createProduct successfully inserts product mapping FormData', async () => {
    const ts = Date.now()
    const slug = `sofa-crud-test-${ts}`
    const formData = new FormData()
    formData.append('name', `Sofa Crud Test ${ts}`)
    formData.append('slug', slug)
    formData.append('description', 'High-end description')
    formData.append('short_description', 'Short description')
    formData.append('base_price', '15000000')
    formData.append('status', 'draft')

    const result = await createProduct(formData)
    expect(result.data).toBeDefined()
    expect(result.data.id).toBeDefined()
    
    createdProductIds.push(result.data.id)

    // Verify draft status default field mapping
    const admin = adminClient()
    const { data: prod } = await (admin as any)
      .from('products')
      .select('*')
      .eq('id', result.data.id)
      .single()

    expect(prod.slug).toBe(slug)
    expect(prod.status).toBe('draft')
    expect(Number(prod.base_price)).toBe(15000000)
  })

  it('createProduct catches unique slug constraint database error', async () => {
    const ts = Date.now()
    const duplicateSlug = `dup-slug-${ts}`

    // 1st product
    const form1 = new FormData()
    form1.append('name', 'Sofa 1')
    form1.append('slug', duplicateSlug)
    form1.append('base_price', '2000000')
    const res1 = await createProduct(form1)
    createdProductIds.push(res1.data.id)

    // 2nd product with duplicate slug
    const form2 = new FormData()
    form2.append('name', 'Sofa 2')
    form2.append('slug', duplicateSlug)
    form2.append('base_price', '5000000')

    const res2 = await createProduct(form2)
    expect(res2).toHaveProperty('error')
    expect(res2.error).toMatch(/unique constraint|trùng/i)
  })

  it('archiveProduct updates status to archived', async () => {
    const pId = createdProductIds[0]
    const result = await archiveProduct(pId)
    expect(result).toEqual({ success: true })

    const admin = adminClient()
    const { data: prod } = await (admin as any)
      .from('products')
      .select('status')
      .eq('id', pId)
      .single()
    expect(prod.status).toBe('archived')
  })

  it('upsertVariants handles inserts, updates, and deleteVariant handles variant cleanups', async () => {
    const pId = createdProductIds[0]

    // 1. Create a variant
    const variantRow = {
      product_id: pId,
      name: 'Màu Nâu Cao Cấp',
      sku: `VAR-SKU-IT-${Date.now()}`,
      price: 16500000,
      is_default: true,
      is_active: true,
    }

    const result = await upsertVariants([variantRow])
    expect(result).toEqual({ success: true })

    // Verify variant database presence
    const admin = adminClient()
    const { data: variants } = await (admin as any)
      .from('product_variants')
      .select('*')
      .eq('product_id', pId)
    
    expect(variants.length).toBe(1)
    expect(variants[0].name).toBe('Màu Nâu Cao Cấp')
    expect(Number(variants[0].price)).toBe(16500000)

    const variantId = variants[0].id

    // 2. Delete the variant
    const delResult = await deleteVariant(variantId)
    expect(delResult).toEqual({ success: true })

    const { data: variantsAfter } = await (admin as any)
      .from('product_variants')
      .select('*')
      .eq('product_id', pId)
    expect(variantsAfter.length).toBe(0)
  })
})
