const mockQB: any = {}
const mockClient: any = {}

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [], set: () => {} })),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockClient)),
}))

import { revalidatePath } from 'next/cache'
import { assignRole, revokeRole } from '@/app/(admin)/admin/actions/roles'

const mockRevalidatePath = revalidatePath as jest.Mock

function setupMockQB(overrides: { data?: any; error?: any } = {}) {
  const { data = null, error = null } = overrides

  mockQB.select = jest.fn().mockReturnValue(mockQB)
  mockQB.eq = jest.fn().mockReturnValue(mockQB)
  mockQB.insert = jest.fn().mockReturnValue(mockQB)
  mockQB.delete = jest.fn().mockReturnValue(mockQB)
  mockQB.single = jest.fn().mockResolvedValue({ data, error })
  mockQB.then = jest.fn((resolve) => resolve({ data, error }))

  mockClient.from = jest.fn().mockReturnValue(mockQB)
}

describe('Server Actions: Roles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMockQB()
  })

  // ─── assignRole ───────────────────────────────────────────────────────────────

  describe('assignRole', () => {
    it('insert vào user_roles, sau đó insert audit log', async () => {
      setupMockQB({ data: null, error: null })
      const result = await assignRole('user-1', 'catalog_manager')
      expect(mockClient.from).toHaveBeenCalledWith('user_roles')
      expect(mockQB.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', role: 'catalog_manager' })
      )
      expect(result).toEqual({ success: true })
    })

    it('ghi audit log admin_audit_logs sau khi assign thành công', async () => {
      setupMockQB({ data: null, error: null })
      await assignRole('user-1', 'catalog_manager')
      expect(mockClient.from).toHaveBeenCalledWith('admin_audit_logs')
    })

    it('duplicate role (error.code 23505) → trả friendly error tiếng Việt', async () => {
      mockClient.from = jest.fn((table: string) => {
        if (table === 'user_roles') {
          const errQB: any = {}
          errQB.insert = jest.fn().mockReturnValue(errQB)
          errQB.then = jest.fn((resolve) =>
            resolve({ data: null, error: { code: '23505', message: 'duplicate key' } })
          )
          return errQB
        }
        return mockQB
      })
      const result = await assignRole('user-1', 'catalog_manager')
      expect(result).toHaveProperty('error')
      expect((result as any).error).toMatch(/đã có/)
    })

    it('revalidate /admin/settings/roles sau khi thành công', async () => {
      setupMockQB()
      await assignRole('user-1', 'catalog_manager')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/settings/roles')
    })

    it('error không phải duplicate → trả error message gốc', async () => {
      setupMockQB({ error: { code: 'OTHER', message: 'DB connection error' } })
      const result = await assignRole('user-1', 'admin')
      expect(result).toHaveProperty('error')
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─── revokeRole ───────────────────────────────────────────────────────────────

  describe('revokeRole', () => {
    it('delete role từ user_roles với 2 eq filters', async () => {
      setupMockQB()
      const result = await revokeRole('user-1', 'catalog_manager')
      expect(mockClient.from).toHaveBeenCalledWith('user_roles')
      expect(mockQB.delete).toHaveBeenCalled()
      expect(mockQB.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQB.eq).toHaveBeenCalledWith('role', 'catalog_manager')
      expect(result).toEqual({ success: true })
    })

    it('ghi audit log sau khi revoke thành công', async () => {
      setupMockQB()
      await revokeRole('user-1', 'catalog_manager')
      expect(mockClient.from).toHaveBeenCalledWith('admin_audit_logs')
    })

    it('revalidate /admin/settings/roles sau khi revoke', async () => {
      setupMockQB()
      await revokeRole('user-1', 'catalog_manager')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/settings/roles')
    })

    it('trả { error } khi delete thất bại', async () => {
      setupMockQB({ error: { message: 'delete failed' } })
      const result = await revokeRole('user-1', 'admin')
      expect(result).toHaveProperty('error')
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })
})
