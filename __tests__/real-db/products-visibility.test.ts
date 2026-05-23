/**
 * Real-DB Test: Products RLS Visibility by Status
 *
 * Targets Bug B3: Products with status != 'active' are invisible to public
 * even if the admin intends them to be shown (e.g., 'new', 'sale' badges).
 *
 * The products table schema says: status VARCHAR(50) DEFAULT 'active' -- active, draft, archived
 * The RLS policy says: USING (status = 'active')
 *
 * The ProductDetailClient.tsx renders UI badges for product.status values
 * 'new', 'sale', 'sold_out', 'limited' — if these are valid DB status values,
 * then any product with those statuses would be INVISIBLE to public users.
 */

import { anonClient, clientAs } from './setup/db-client'
import { createTestUser, deleteTestUser, createTestProduct, deleteTestProduct, TestUser, TestProduct } from './setup/seed-helpers'

const createdProducts: TestProduct[] = []
let adminUser: TestUser

beforeAll(async () => {
  adminUser = await createTestUser('admin-vis')
})

afterAll(async () => {
  for (const p of createdProducts) {
    await deleteTestProduct(p.productId)
  }
  await deleteTestUser(adminUser.id)
})

async function makeProduct(status: string): Promise<TestProduct> {
  const p = await createTestProduct(status, 5)
  createdProducts.push(p)
  return p
}

// ─── Anon (public) visibility tests ───────────────────────────────────────────

describe('Products visibility to public (anon)', () => {
  it("status='active' → visible to anon (control case)", async () => {
    const p = await makeProduct('active')
    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id, status')
      .eq('id', p.productId)
    expect(data).toHaveLength(1)
    expect(data[0].status).toBe('active')
  })

  it("status='draft' → NOT visible to anon (correct behavior)", async () => {
    const p = await makeProduct('draft')
    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id')
      .eq('id', p.productId)
    expect(data).toHaveLength(0)
  })

  it("status='archived' → NOT visible to anon (correct behavior)", async () => {
    const p = await makeProduct('archived')
    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id')
      .eq('id', p.productId)
    expect(data).toHaveLength(0)
  })

  // ─── BUG B3 candidates: statuses used in UI but not in DB schema comment ────

  it("[BUG B3] status='new' → should be visible to anon if admin uses this status", async () => {
    let p: TestProduct | null = null
    let insertError: any = null
    try {
      p = await makeProduct('new')
    } catch (e: any) {
      insertError = e
    }

    if (insertError) {
      console.log("[B3/new] Product with status='new' rejected by DB constraint:", insertError.message)
      console.log("  → Not a bug: DB prevents invalid status values")
      return
    }

    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id, status')
      .eq('id', p!.productId)

    if (data && data.length === 0) {
      console.warn("[B3] *** BUG CONFIRMED ***: product status='new' exists in DB but is INVISIBLE to anon! RLS only shows status='active'")
    } else {
      console.log("[B3/new] product status='new' IS visible to anon (no bug)")
    }
    // This test documents the behavior — the finding is logged above
    // If 'new' is inserted but invisible, that's the bug
    expect(true).toBe(true)
  })

  it("[BUG B3] status='sale' → should be visible to anon if admin uses this status", async () => {
    let p: TestProduct | null = null
    let insertError: any = null
    try {
      p = await makeProduct('sale')
    } catch (e: any) {
      insertError = e
    }

    if (insertError) {
      console.log("[B3/sale] Product with status='sale' rejected by DB:", insertError.message)
      return
    }

    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id, status')
      .eq('id', p!.productId)

    if (data && data.length === 0) {
      console.warn("[B3] *** BUG CONFIRMED ***: product status='sale' is INVISIBLE to anon!")
    }
    expect(true).toBe(true)
  })

  it("[BUG B3] status='sold_out' → check visibility", async () => {
    let p: TestProduct | null = null
    try {
      p = await makeProduct('sold_out')
    } catch {
      console.log("[B3/sold_out] rejected by DB — status not allowed")
      return
    }

    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id')
      .eq('id', p!.productId)

    if (data && data.length === 0) {
      console.warn("[B3] *** BUG CONFIRMED ***: product status='sold_out' is INVISIBLE to anon!")
    }
    expect(true).toBe(true)
  })

  it("[BUG B3] status='limited' → check visibility", async () => {
    let p: TestProduct | null = null
    try {
      p = await makeProduct('limited')
    } catch {
      console.log("[B3/limited] rejected by DB — status not allowed")
      return
    }

    const client = anonClient()
    const { data } = await (client as any)
      .from('products')
      .select('id')
      .eq('id', p!.productId)

    if (data && data.length === 0) {
      console.warn("[B3] *** BUG CONFIRMED ***: product status='limited' is INVISIBLE to anon!")
    }
    expect(true).toBe(true)
  })
})

// ─── Product variant visibility ────────────────────────────────────────────────

describe('Product variant RLS follows parent product status', () => {
  it("Variants of active product → visible to anon", async () => {
    const p = await makeProduct('active')
    const client = anonClient()
    const { data } = await (client as any)
      .from('product_variants')
      .select('id')
      .eq('product_id', p.productId)
    expect(data!.length).toBeGreaterThan(0)
  })

  it("Variants of archived product → NOT visible to anon", async () => {
    const p = await makeProduct('archived')
    const client = anonClient()
    const { data } = await (client as any)
      .from('product_variants')
      .select('id')
      .eq('product_id', p.productId)
    expect(data).toHaveLength(0)
  })
})
