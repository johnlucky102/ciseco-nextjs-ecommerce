'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function adjustInventory(
  variantId: string,
  delta: number,
  reason: string,
  note?: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_adjust_inventory', {
    p_variant_id: variantId,
    p_delta: delta,
    p_reason: reason,
    p_note: note,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/inventory')
  return { data }
}

export async function setInventoryQuantity(
  variantId: string,
  newQuantity: number,
  reason: string,
  note?: string
) {
  const supabase = await createClient()

  // Get current quantity first
  const { data: inv } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('variant_id', variantId)
    .single()

  if (!inv) return { error: 'Inventory record not found' }

  const delta = newQuantity - inv.quantity
  if (delta === 0) return { success: true }

  return adjustInventory(variantId, delta, reason, note)
}
