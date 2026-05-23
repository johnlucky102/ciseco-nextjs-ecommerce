import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Shared mock state ────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockSignOut = jest.fn().mockResolvedValue({})

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, refresh: jest.fn(), back: jest.fn() })),
  usePathname: jest.fn(() => '/admin'),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}))

jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)

import AdminNav from '@/components/admin/AdminNav'
import AdminTopbar from '@/components/admin/AdminTopbar'
import { usePathname } from 'next/navigation'

// ─── AdminNav ─────────────────────────────────────────────────────────────────

describe('AdminNav', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePathname as jest.Mock).mockReturnValue('/admin')
  })

  it('render 5 nav links với đúng label', () => {
    render(<AdminNav />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Sản phẩm')).toBeInTheDocument()
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument()
    expect(screen.getByText('Kho hàng')).toBeInTheDocument()
    expect(screen.getByText('Phân quyền')).toBeInTheDocument()
  })

  it('render đúng href cho mỗi nav item', () => {
    render(<AdminNav />)
    expect(screen.getByRole('link', { name: /Sản phẩm/ })).toHaveAttribute('href', '/admin/products')
    expect(screen.getByRole('link', { name: /Đơn hàng/ })).toHaveAttribute('href', '/admin/orders')
    expect(screen.getByRole('link', { name: /Kho hàng/ })).toHaveAttribute('href', '/admin/inventory')
    expect(screen.getByRole('link', { name: /Phân quyền/ })).toHaveAttribute('href', '/admin/settings/roles')
  })

  it('Dashboard active khi pathname = /admin (exact match)', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/admin')
    render(<AdminNav />)
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/ })
    expect(dashboardLink.className).toContain('bg-neutral-700')
  })

  it('Dashboard KHÔNG active khi pathname = /admin/products', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/admin/products')
    render(<AdminNav />)
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/ })
    expect(dashboardLink.className).not.toContain('bg-neutral-700')
  })

  it('Sản phẩm active khi pathname = /admin/products', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/admin/products')
    render(<AdminNav />)
    const productLink = screen.getByRole('link', { name: /Sản phẩm/ })
    expect(productLink.className).toContain('bg-neutral-700')
  })

  it('hiển thị header "Admin Panel"', () => {
    render(<AdminNav />)
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })
})

// ─── AdminTopbar ──────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '',
} as any

describe('AdminTopbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('hiển thị email của user', () => {
    render(<AdminTopbar user={mockUser} userRole="admin" />)
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('hiển thị role label tiếng Việt cho admin', () => {
    render(<AdminTopbar user={mockUser} userRole="admin" />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('hiển thị role label cho catalog_manager', () => {
    render(<AdminTopbar user={mockUser} userRole="catalog_manager" />)
    expect(screen.getByText('Quản lý Catalog')).toBeInTheDocument()
  })

  it('hiển thị role label cho order_manager', () => {
    render(<AdminTopbar user={mockUser} userRole="order_manager" />)
    expect(screen.getByText('Quản lý Đơn hàng')).toBeInTheDocument()
  })

  it('logout: gọi signOut và redirect /login', async () => {
    render(<AdminTopbar user={mockUser} userRole="admin" />)
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('loading state: disable button khi đang đăng xuất', async () => {
    mockSignOut.mockImplementation(() => new Promise(r => setTimeout(r, 500)))
    render(<AdminTopbar user={mockUser} userRole="admin" />)
    const btn = screen.getByRole('button', { name: /Đăng xuất/ })
    fireEvent.click(btn)
    expect(btn).toBeDisabled()
  })
})
