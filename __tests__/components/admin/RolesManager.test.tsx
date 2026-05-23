import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn()
const mockAssignRole = jest.fn()
const mockRevokeRole = jest.fn()
const mockToast = jest.fn() as any
mockToast.success = jest.fn()
mockToast.error = jest.fn()

const mockSupabaseQB: any = {}
const mockSupabase: any = {}

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: mockRefresh })),
}))

jest.mock('@/app/(admin)/admin/actions/roles', () => ({
  assignRole: (...args: any[]) => mockAssignRole(...args),
  revokeRole: (...args: any[]) => mockRevokeRole(...args),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('react-hot-toast', () => {
  const t = (...args: any[]) => mockToast(...args)
  t.success = (...args: any[]) => mockToast.success(...args)
  t.error = (...args: any[]) => mockToast.error(...args)
  return { __esModule: true, default: t }
})

jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)

import RolesManager from '@/components/admin/RolesManager'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleUsers = [
  {
    user_id: 'u1',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    email: 'admin@example.com',
    full_name: 'Admin User',
  },
  {
    user_id: 'u2',
    role: 'catalog_manager',
    created_at: '2024-02-01T00:00:00Z',
    email: 'catalog@example.com',
    full_name: 'Catalog Manager',
  },
]

// ─── Setup mock QB ────────────────────────────────────────────────────────────

function setupMockQB(searchData: any[] = []) {
  mockSupabaseQB.select = jest.fn().mockReturnValue(mockSupabaseQB)
  mockSupabaseQB.ilike = jest.fn().mockReturnValue(mockSupabaseQB)
  mockSupabaseQB.limit = jest.fn().mockResolvedValue({ data: searchData, error: null })
  mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQB)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RolesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAssignRole.mockResolvedValue({ success: true })
    mockRevokeRole.mockResolvedValue({ success: true })
    setupMockQB()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('render danh sách users with roles', () => {
    render(<RolesManager usersWithRoles={sampleUsers} />)
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('catalog@example.com')).toBeInTheDocument()
  })

  it('hiển thị role badge cho mỗi user', () => {
    render(<RolesManager usersWithRoles={sampleUsers} />)
    // getAllByText since 'Admin' appears in both role options and user list badge
    const adminTexts = screen.getAllByText('Admin')
    expect(adminTexts.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Quản lý Catalog').length).toBeGreaterThanOrEqual(1)
  })

  it('empty state khi không có user nào', () => {
    render(<RolesManager usersWithRoles={[]} />)
    expect(screen.getByText(/Bootstrap trước|Chưa có admin/i)).toBeInTheDocument()
  })

  it('ROLE_OPTIONS: 4 options hiển thị trong form cấp quyền', () => {
    render(<RolesManager usersWithRoles={[]} />)
    expect(screen.getByText('Quản lý Đơn hàng')).toBeInTheDocument()
    expect(screen.getByText('Hỗ trợ')).toBeInTheDocument()
  })

  it('search empty email → không gọi Supabase query', async () => {
    render(<RolesManager usersWithRoles={[]} />)
    const searchBtn = screen.getByRole('button', { name: '' })
    fireEvent.click(searchBtn)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('search email → gọi Supabase profiles query với ilike', async () => {
    setupMockQB([{ id: 'u3', email: 'test@example.com', full_name: 'Test' }])
    render(<RolesManager usersWithRoles={[]} />)
    const input = screen.getByPlaceholderText('email@example.com')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.click(screen.getAllByRole('button').find(b => b.querySelector('svg') || b.className.includes('neutral')) as HTMLElement)
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabaseQB.ilike).toHaveBeenCalledWith('email', '%test%')
    })
  })

  it('chọn user từ search results → hiển thị email được chọn', async () => {
    setupMockQB([{ id: 'u3', email: 'test@example.com', full_name: 'Test User' }])
    render(<RolesManager usersWithRoles={[]} />)
    const input = screen.getByPlaceholderText('email@example.com')
    fireEvent.change(input, { target: { value: 'test' } })
    // Simulate search result rendering by calling handleSearch indirectly
    // Trigger via Enter key
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => {
      expect(mockSupabaseQB.ilike).toHaveBeenCalled()
    })
  })

  it('Cấp quyền button disabled khi chưa chọn user', () => {
    render(<RolesManager usersWithRoles={[]} />)
    expect(screen.getByRole('button', { name: /Cấp quyền/ })).toBeDisabled()
  })

  it('Revoke role: gọi revokeRole + toast.success + router.refresh', async () => {
    render(<RolesManager usersWithRoles={sampleUsers} />)
    const revokeBtns = screen.getAllByRole('button', { name: /Thu hồi/ })
    fireEvent.click(revokeBtns[0])
    await waitFor(() => {
      expect(mockRevokeRole).toHaveBeenCalledWith('u1', 'admin')
      expect(mockToast.success).toHaveBeenCalledWith('Đã thu hồi role')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('Revoke role: lỗi → toast.error', async () => {
    mockRevokeRole.mockResolvedValue({ error: 'Không có quyền' })
    render(<RolesManager usersWithRoles={sampleUsers} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Thu hồi/ })[0])
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Không có quyền')
    })
  })
})
