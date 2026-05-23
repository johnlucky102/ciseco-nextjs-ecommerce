import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockRefreshCO = jest.fn()
const mockRouter = { push: mockPush, refresh: mockRefreshCO }
const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockEq = jest.fn()
const mockMaybySingle = jest.fn()
const mockSelect = jest.fn()
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

import CheckoutPage from '@/app/checkout/page'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockCartItem = {
  id: 'ci-1',
  quantity: 1,
  variant: {
    id: 'var-1',
    price: 3000000,
    color: 'Trắng',
    product: {
      id: 'prod-1',
      name: 'Ghế Văn Phòng',
      slug: 'ghe-van-phong',
      product_images: [{ image_url: '/img.jpg', alt_text: null, is_primary: true }],
    },
  },
}

const mockCart = { id: 'cart-1', cart_items: [mockCartItem] }
const mockUser = { id: 'u1', email: 'user@test.com', user_metadata: { full_name: 'Test User' } }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupCheckoutMock(user: any = mockUser, cartData: any = mockCart) {
  mockGetUser.mockResolvedValue({ data: { user } })
  mockMaybySingle.mockResolvedValue({ data: cartData, error: null })
  mockEq.mockReturnValue({ maybeSingle: mockMaybySingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockSupabase.auth = { getUser: mockGetUser }
  mockSupabase.from = jest.fn(() => ({ select: mockSelect }))
  mockSupabase.rpc = mockRpc
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: 'order-123', error: null })
  })

  it('unauthenticated → router.push("/login")', async () => {
    setupCheckoutMock(null)
    render(<CheckoutPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('render heading Thanh toán', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Thanh toán/i })).toBeInTheDocument()
    })
  })

  it('render form Thông tin giao hàng', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => {
      expect(screen.getByText('Thông tin giao hàng')).toBeInTheDocument()
    })
  })

  it('auto-fill email từ user', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => {
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
      expect(emailInput?.value).toBe('user@test.com')
    })
  })

  it('hiển thị sản phẩm trong order summary', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => {
      expect(screen.getByText('Ghế Văn Phòng')).toBeInTheDocument()
    })
  })

  it('hiển thị tổng tiền khu vực tóm tắt', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => {
      expect(screen.getByText(/Tóm tắt đơn hàng/i)).toBeInTheDocument()
    })
  })

  it('submit khi thiếu trường bắt buộc → hiển thị error', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => screen.getByText('Ghế Văn Phòng'))
    // Click without filling phone/address/city/province
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đặt hàng/i }))
    await waitFor(() => {
      expect(screen.getByText(/Vui lòng nhập đầy đủ thông tin giao hàng/i)).toBeInTheDocument()
    })
  })

  it('submit đặt hàng thành công → gọi rpc create_order_from_cart', async () => {
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => screen.getByText('Ghế Văn Phòng'))
    // Fill all required fields
    const inputs = document.querySelectorAll('input:not([type="radio"])')
    const allInputs = Array.from(inputs) as HTMLInputElement[]
    allInputs.forEach(input => {
      if (!input.value) fireEvent.change(input, { target: { value: 'Test Value' } })
    })
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đặt hàng/i }))
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        'create_order_from_cart',
        expect.objectContaining({ p_user_id: 'u1' })
      )
    })
  })

  it('submit lỗi từ server → hiển thị error message', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Hết hàng' } })
    setupCheckoutMock()
    render(<CheckoutPage />)
    await waitFor(() => screen.getByText('Ghế Văn Phòng'))
    const inputs = document.querySelectorAll('input:not([type="radio"])')
    Array.from(inputs).forEach((input: any) => {
      if (!input.value) fireEvent.change(input, { target: { value: 'Test' } })
    })
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đặt hàng/i }))
    await waitFor(() => {
      expect(screen.getByText('Hết hàng')).toBeInTheDocument()
    })
  })
})
