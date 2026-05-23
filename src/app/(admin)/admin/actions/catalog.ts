'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Product CRUD ─────────────────────────────────────────────────────────────

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const payload = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    short_description: formData.get('short_description') as string,
    base_price: Number(formData.get('base_price')),
    compare_at_price: formData.get('compare_at_price') ? Number(formData.get('compare_at_price')) : null,
    cost_price: formData.get('cost_price') ? Number(formData.get('cost_price')) : null,
    sku: formData.get('sku') as string || null,
    category_id: formData.get('category_id') as string || null,
    room_id: formData.get('room_id') as string || null,
    status: (formData.get('status') as string) || 'draft',
    is_featured: formData.get('is_featured') === 'true',
    is_new: formData.get('is_new') === 'true',
    meta_title: formData.get('meta_title') as string || null,
    meta_description: formData.get('meta_description') as string || null,
  }

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('id, slug')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { data }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const payload = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    short_description: formData.get('short_description') as string,
    base_price: Number(formData.get('base_price')),
    compare_at_price: formData.get('compare_at_price') ? Number(formData.get('compare_at_price')) : null,
    cost_price: formData.get('cost_price') ? Number(formData.get('cost_price')) : null,
    sku: formData.get('sku') as string || null,
    category_id: formData.get('category_id') as string || null,
    room_id: formData.get('room_id') as string || null,
    status: formData.get('status') as string,
    is_featured: formData.get('is_featured') === 'true',
    is_new: formData.get('is_new') === 'true',
    meta_title: formData.get('meta_title') as string || null,
    meta_description: formData.get('meta_description') as string || null,
  }

  const { error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${id}/edit`)
  return { success: true }
}

export async function archiveProduct(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ status: 'archived' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/products')
  return { success: true }
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export interface VariantInput {
  id?: string
  product_id: string
  name: string
  sku?: string
  price: number
  compare_at_price?: number | null
  color?: string
  is_default: boolean
  is_active: boolean
  height?: number | null
  width?: number | null
  depth?: number | null
  material_ids?: string[]
  initial_stock?: number
}

export async function upsertVariants(variants: VariantInput[]) {
  const supabase = await createClient()

  for (const v of variants) {
    const { material_ids, initial_stock, id, ...variantData } = v

    let variantId = id
    if (id) {
      // Update existing
      const { error } = await supabase
        .from('product_variants')
        .update(variantData)
        .eq('id', id)
      if (error) return { error: error.message }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('product_variants')
        .insert(variantData)
        .select('id')
        .single()
      if (error) return { error: error.message }
      variantId = data.id

      // Create inventory record
      if (variantId) {
        await supabase.from('inventory').insert({
          variant_id: variantId,
          quantity: initial_stock ?? 0,
          reserved_quantity: 0,
        })
      }
    }

    // Sync materials
    if (variantId && material_ids) {
      const vid = variantId as string
      await supabase
        .from('product_variant_materials')
        .delete()
        .eq('variant_id', vid)

      if (material_ids.length > 0) {
        await supabase.from('product_variant_materials').insert(
          material_ids.map(mid => ({ variant_id: vid, material_id: mid }))
        )
      }
    }
  }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function deleteVariant(variantId: string, productId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true }
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function addProductImageUrl(productId: string, imageUrl: string, isPrimary = false) {
  const supabase = await createClient()
  const { error } = await supabase.from('product_images').insert({
    product_id: productId,
    image_url: imageUrl,
    is_primary: isPrimary,
  })
  if (error) return { error: error.message }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true }
}

export async function deleteProductImage(imageId: string, productId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true }
}

export async function setPrimaryImage(imageId: string, productId: string) {
  const supabase = await createClient()
  await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId)
  await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId)
  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true }
}

// ─── Categories & Rooms (for selects) ─────────────────────────────────────────

export async function getCategories() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getRooms() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rooms')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getMaterials() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('materials')
    .select('id, name, slug, material_type')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}
