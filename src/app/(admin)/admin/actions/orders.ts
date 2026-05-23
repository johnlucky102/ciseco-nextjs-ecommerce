'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateOrderStatus(
  orderId: string,
  nextStatus: string,
  note?: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_next_status: nextStatus,
    p_note: note,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  return { data }
}

export async function upsertOrderFulfillment(
  orderId: string,
  payload: {
    team_id?: string | null
    vehicle_id?: string | null
    scheduled_at?: string | null
    delivery_notes?: string | null
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('order_fulfillments')
    .upsert({ order_id: orderId, ...payload }, { onConflict: 'order_id' })
  if (error) return { error: error.message }
  revalidatePath(`/admin/orders/${orderId}`)
  return { success: true }
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/orders/${orderId}`)
  return { success: true }
}

export async function createInstallationTeam(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('installation_teams').insert({
    name: formData.get('name') as string,
    leader_name: formData.get('leader_name') as string || null,
    phone: formData.get('phone') as string || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/orders')
  return { success: true }
}

export async function createDeliveryVehicle(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('delivery_vehicles').insert({
    license_plate: formData.get('license_plate') as string,
    vehicle_type: formData.get('vehicle_type') as string || null,
    capacity_kg: formData.get('capacity_kg') ? Number(formData.get('capacity_kg')) : null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/orders')
  return { success: true }
}
