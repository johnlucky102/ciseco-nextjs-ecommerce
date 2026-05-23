import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockRefreshAP = jest.fn()
const mockRouter = { push: mockPush, refresh: mockRefreshAP }
const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockSupabase: any = {}

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => mockRouter),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)
jest.mock('@heroicons/react/24/solid', () =>
  new Proxy({}, { get: () => () => null })
)

jest.mock('@/components/ProductCard', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid="product-card">{data?.name}</div>,
}))

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', email: 'user@test.com' }

const mockProfile = {
  id: 'u1',
  full_name: 'Test User',
  email: 'user@test.com',
  phone: '0901234567',
  preferences: { address: '123 Đường ABC', bio: 'Bio mẫu' },
}

const mockOrders = [
  {
    id: 'ord-1',
    status: 'pending',
    payment_status: 'unpaid',
    total_amount: 5000000,
    created_at: '2024-01-15T00:00:00Z',
    order_items: [{ id: 'oi-1', quantity: 1, price: 5000000 }],
  },
]

const mockWishlists = [
  {
    id: 'wl-1',
    user_id: 'u1',
    variant_id: 'var-1',
    variant: {
      id: 'var-1',
      price: 5000000,
      color: 'Xanh',
      product: {
        id: 'prod-1',
        slug: 'sofa-bac-au',
        name: 'Sofa Bắc Âu',
        description: null,
        base_price: 5000000,
        compare_at_price: null,
        status: 'active',
        is_featured: false,
        product_images: [],
        product_variants: [],
      },
    },
  },
]

// ─── Account Profile Page ─────────────────────────────────────────────────────

describe('AccountPage', () => {
  let mockQB: any
  const mockUpdateUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockQB = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }
    mockSupabase.auth = { getUser: mockGetUser, updateUser: mockUpdateUser }
    mockSupabase.from = jest.fn(() => mockQB)
  })

  it('redirect /login nếu unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: AccountPage } = await import('@/app/(accounts)/account/page')
    render(<AccountPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('hiển thị dữ liệu profile sau khi load', async () => {
    const { default: AccountPage } = await import('@/app/(accounts)/account/page')
    render(<AccountPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    })
  })

  it('hiển thị tiêu đề Thông tin tài khoản', async () => {
    const { default: AccountPage } = await import('@/app/(accounts)/account/page')
    render(<AccountPage />)
    await waitFor(() => {
      expect(screen.getByText(/Thông tin tài khoản/i)).toBeInTheDocument()
    })
  })

  it('save profile → gọi supabase upsert', async () => {
    const { default: AccountPage } = await import('@/app/(accounts)/account/page')
    render(<AccountPage />)
    await waitFor(() => screen.getByDisplayValue('Test User'))
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật tài khoản/i }))
    await waitFor(() => {
      expect(mockQB.upsert).toHaveBeenCalled()
    })
  })

  it('save success → hiển thị message thành công', async () => {
    const { default: AccountPage } = await import('@/app/(accounts)/account/page')
    render(<AccountPage />)
    await waitFor(() => screen.getByDisplayValue('Test User'))
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật tài khoản/i }))
    await waitFor(() => {
      expect(screen.getByText(/Cập nhật tài khoản thành công/i)).toBeInTheDocument()
    })
  })
})

// ─── Account Order Page ───────────────────────────────────────────────────────

describe('AccountOrderPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const mockQB: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
    }
    mockSupabase.auth = { getUser: mockGetUser }
    mockSupabase.from = jest.fn(() => mockQB)
  })

  it('redirect /login nếu unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: AccountOrderPage } = await import('@/app/(accounts)/account-order/page')
    render(<AccountOrderPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('hiển thị tiêu đề lịch sử', async () => {
    const { default: AccountOrderPage } = await import('@/app/(accounts)/account-order/page')
    render(<AccountOrderPage />)
    await waitFor(() => {
      expect(screen.getByText(/Lịch sử đơn hàng/i)).toBeInTheDocument()
    })
  })

  it('hiển thị đơn hàng kỳ hiệu #', async () => {
    const { default: AccountOrderPage } = await import('@/app/(accounts)/account-order/page')
    render(<AccountOrderPage />)
    await waitFor(() => {
      // id='ord-1' → slice(0,8) = 'ord-1' → renders '#ord-1'
      expect(screen.getByText('#ord-1')).toBeInTheDocument()
    })
  })

  it('empty state khi không có đơn hàng', async () => {
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }))
    const { default: AccountOrderPage } = await import('@/app/(accounts)/account-order/page')
    render(<AccountOrderPage />)
    await waitFor(() => {
      expect(screen.getByText(/Bạn chưa có đơn hàng nào/i)).toBeInTheDocument()
    })
  })
})

// ─── Account Savelists Page ───────────────────────────────────────────────────

describe('AccountSavelistsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const mockQB: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: mockWishlists, error: null }),
    }
    mockSupabase.auth = { getUser: mockGetUser }
    mockSupabase.from = jest.fn(() => mockQB)
  })

  it('redirect /login nếu unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: AccountSavelistsPage } = await import('@/app/(accounts)/account-savelists/page')
    render(<AccountSavelistsPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('hiển thị tiêu đề Sản phẩm yêu thích', async () => {
    const { default: AccountSavelistsPage } = await import('@/app/(accounts)/account-savelists/page')
    render(<AccountSavelistsPage />)
    await waitFor(() => {
      expect(screen.getByText(/Sản phẩm yêu thích/i)).toBeInTheDocument()
    })
  })

  it('hiển thị product cards từ wishlist', async () => {
    const { default: AccountSavelistsPage } = await import('@/app/(accounts)/account-savelists/page')
    render(<AccountSavelistsPage />)
    await waitFor(() => {
      const cards = screen.getAllByTestId('product-card')
      expect(cards.length).toBe(1)
      expect(cards[0].textContent).toContain('Sofa Bắc Âu')
    })
  })

  it('empty state khi wishlist rỗng', async () => {
    const mockQBEmpty: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockSupabase.from = jest.fn(() => mockQBEmpty)
    const { default: AccountSavelistsPage } = await import('@/app/(accounts)/account-savelists/page')
    render(<AccountSavelistsPage />)
    await waitFor(() => {
      expect(screen.getByText(/Chưa lưu sản phẩm nào/i)).toBeInTheDocument()
    })
  })
})
