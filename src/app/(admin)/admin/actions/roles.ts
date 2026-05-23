'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function assignRole(userId: string, role: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role })

  if (error) {
    if (error.code === '23505') return { error: 'Người dùng đã có role này rồi.' }
    return { error: error.message }
  }

  // Audit log
  await supabase.from('admin_audit_logs').insert({
    action: 'role_assign',
    entity_type: 'user_role',
    entity_id: userId,
    after: { role },
  })

  revalidatePath('/admin/settings/roles')
  return { success: true }
}

export async function revokeRole(userId: string, role: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)

  if (error) return { error: error.message }

  // Audit log
  await supabase.from('admin_audit_logs').insert({
    action: 'role_revoke',
    entity_type: 'user_role',
    entity_id: userId,
    before: { role },
  })

  revalidatePath('/admin/settings/roles')
  return { success: true }
}
