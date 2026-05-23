/**
 * Real-DB Test: Server Actions — Admin RBAC Roles
 *
 * Verifies role assignment, revocation, duplicates, and audit log generation against local Supabase.
 */

import { clientForUser, adminClient } from '../setup/db-client'
import {
  createTestUser,
  deleteTestUser,
} from '../setup/seed-helpers'
import { assignRole, revokeRole } from '@/app/(admin)/admin/actions/roles'

let adminUser: { id: string; email: string }
let regularUser: { id: string; email: string }

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
  adminUser = await createTestUser('roles-actions-admin')
  // Grant admin role via direct seed to allow executing role assignments
  const admin = adminClient()
  await (admin as any).from('user_roles').insert({ user_id: adminUser.id, role: 'admin' })

  regularUser = await createTestUser('roles-actions-regular')
})

afterAll(async () => {
  await deleteTestUser(regularUser.id)
  await deleteTestUser(adminUser.id)
})

describe('Roles Server Actions — Real-DB', () => {
  it('assignRole inserts into user_roles and logs into admin_audit_logs', async () => {
    const result = await assignRole(regularUser.id, 'catalog_manager')
    expect(result).toEqual({ success: true })

    // Verify role assignment
    const admin = adminClient()
    const { data: userRoles } = await (admin as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', regularUser.id)
    
    expect(userRoles.some((ur: any) => ur.role === 'catalog_manager')).toBe(true)

    // Verify audit log entry
    const { data: auditLogs } = await (admin as any)
      .from('admin_audit_logs')
      .select('*')
      .eq('action', 'role_assign')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditLogs.length).toBe(1)
    expect(auditLogs[0].entity_id).toBe(regularUser.id)
  })

  it('assignRole fails with duplicate role assignment constraint', async () => {
    // Attempting to assign catalog_manager again
    const result = await assignRole(regularUser.id, 'catalog_manager')
    expect(result).toHaveProperty('error')
    expect((result as any).error).toMatch(/đã có/)
  })

  it('revokeRole removes the user role and creates an audit log entry', async () => {
    const result = await revokeRole(regularUser.id, 'catalog_manager')
    expect(result).toEqual({ success: true })

    // Verify role is gone
    const admin = adminClient()
    const { data: userRoles } = await (admin as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', regularUser.id)
    
    expect(userRoles.some((ur: any) => ur.role === 'catalog_manager')).toBe(false)

    // Verify audit log entry
    const { data: auditLogs } = await (admin as any)
      .from('admin_audit_logs')
      .select('*')
      .eq('action', 'role_revoke')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditLogs.length).toBe(1)
    expect(auditLogs[0].entity_id).toBe(regularUser.id)
  })
})
