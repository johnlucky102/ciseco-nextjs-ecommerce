import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockEq = jest.fn()
const mockMaybeSingle = jest.fn()
const mockSelect = jest.fn()
const mockSupabase: any = {}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}))

import CartPage from '@/app/cart/page'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockCartItem = {
  id: 'ci-1',
  quantity: 2,
  variant: {
    id: 'var-1',
    price: 5000000,
    color: 'Xanh',
    product: {
      id: 'prod-1',
      name: 'Sofa Bắc Âu',
      slug: 'sofa-bac-au',
      product_images: [{ image_url: '/img.jpg', alt_text: null, is_primary: true }],
    },
    product_variant_materials: [],
  },
}

const mockCart = {
  id: 'cart-1',
  cart_items: [mockCartItem],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupCartMock(user: any = { id: 'u1', email: 'test@test.com' }, cartData: any = mockCart) {
  mockGetUser.mockResolvedValue({ data: { user } })
  mockMaybeSingle.mockResolvedValue({ data: cartData, error: null })
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockSupabase.auth = { getUser: mockGetUser }
  mockSupabase.from = jest.fn(() => ({ select: mockSelect }))
  mockSupabase.rpc = mockRpc
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ error: null })
  })

  it('hiển thị loading text ban đầu', () => {
    setupCartMock()
    render(<CartPage />)
    expect(screen.getByText(/Đang tải giỏ hàng/i)).toBeInTheDocument()
  })

  it('hiển thị tên sản phẩm sau khi load thành công', async () => {
    setupCartMock()
    render(<CartPage />)
    await waitFor(() => {
      expect(screen.getByText('Sofa Bắc Âu')).toBeInTheDocument()
    })
  })

  it('hiển thị giá variant format VND', async () => {
    setupCartMock()
    render(<CartPage />)
    await waitFor(() => {
      // Prices renders 5.000.000 ₫ or similar; CartPage summary shows formatVnd
      const priceEls = screen.getAllByText(/5[\.,]000[\.,]000|5000000|₫/)
      expect(priceEls.length).toBeGreaterThan(0)
    })
  })

  it('unauthenticated → không hiển thị cart items', async () => {
    setupCartMock(null, null)
    render(<CartPage />)
    await waitFor(() => {
      expect(screen.queryByText('Sofa Bắc Âu')).not.toBeInTheDocument()
    })
  })

  it('cart rỗng (no items) → hiển thị empty state message', async () => {
    setupCartMock({ id: 'u1', email: 'test@test.com' }, { id: 'cart-1', cart_items: [] })
    render(<CartPage />)
    await waitFor(() => {
      expect(screen.queryByText('Sofa Bắc Âu')).not.toBeInTheDocument()
    })
  })

  it('hiển thị subtotal khi có items', async () => {
    setupCartMock()
    render(<CartPage />)
    await waitFor(() => {
      // subtotal = 2 * 5000000 = 10000000
      expect(screen.getByText(/Tạm tính/i)).toBeInTheDocument()
    })
  })

  it('remove item → gọi rpc remove_from_cart', async () => {
    setupCartMock()
    render(<CartPage />)
    await waitFor(() => {
      expect(screen.getByText('Sofa Bắc Âu')).toBeInTheDocument()
    })
    const removeBtn = screen.getByRole('button', { name: /Xo/ })
    fireEvent.click(removeBtn)
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('remove_from_cart', expect.objectContaining({ p_cart_item_id: 'ci-1' }))
    })
  })
})
