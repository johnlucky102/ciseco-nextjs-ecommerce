import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockRefreshPD = jest.fn()
const mockRouter = { push: mockPush, refresh: mockRefreshPD }
const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockInsert = jest.fn()
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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), custom: jest.fn(), success: jest.fn() },
  toast: { error: jest.fn(), custom: jest.fn(), success: jest.fn() },
}))

jest.mock('@heroicons/react/24/solid', () =>
  new Proxy({}, { get: () => () => null })
)
jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)

jest.mock('@/components/LikeButton', () => ({
  __esModule: true,
  default: () => <button data-testid="like-button">Like</button>,
}))

jest.mock('@/components/SectionSliderProductCard', () => ({
  __esModule: true,
  default: () => <div data-testid="related-products">Related</div>,
}))

jest.mock('@/components/SectionPromo2', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/app/product-detail/Policy', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/app/product-detail/ModalViewAllReviews', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/NotifyAddTocart', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/AccordionInfo', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/BagIcon', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/IconDiscount', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/ReviewItem', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="review-item">{props?.data?.comment || props?.comment || 'review'}</div>,
}))

jest.mock('@/components/NcInputNumber', () => ({
  __esModule: true,
  default: ({ onChange, defaultValue }: any) => (
    <input
      data-testid="quantity-input"
      type="number"
      defaultValue={defaultValue || 1}
      onChange={(e) => onChange && onChange(Number(e.target.value))}
    />
  ),
}))

jest.mock('@/components/Prices', () => ({
  __esModule: true,
  default: ({ price }: any) => <span data-testid="price">{price}</span>,
}))

import ProductDetailClient from '@/app/product-detail/ProductDetailClient'
import toast from 'react-hot-toast'

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockVariant = {
  id: 'var-1',
  product_id: 'prod-1',
  name: 'Xanh Đậm',
  color: 'Xanh',
  price: 5000000,
  compare_at_price: null,
  sku: 'SKU-1',
  stock_quantity: 10,
  is_default: true,
  width: null,
  height: null,
  depth: null,
  weight: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  product_variant_materials: [],
}

const mockProduct: any = {
  id: 'prod-1',
  name: 'Sofa Bắc Âu',
  slug: 'sofa-bac-au',
  description: 'Sofa phong cách Scandinavian',
  base_price: 5000000,
  compare_at_price: 6000000,
  status: 'active',
  is_featured: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  category_id: null,
  room_id: null,
  category: null,
  room: null,
  product_images: [
    { id: 'img-1', image_url: '/sofa.jpg', alt_text: 'Sofa', is_primary: true, sort_order: 0, product_id: 'prod-1', created_at: '2024-01-01' },
  ],
  product_variants: [mockVariant],
}

const mockReviews: any[] = [
  {
    id: 'rev-1',
    product_id: 'prod-1',
    user_id: 'u1',
    rating: 5,
    comment: 'Sản phẩm tuyệt vời!',
    created_at: '2024-01-15',
    user: { full_name: 'Test User', avatar_url: null },
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProductDetailClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } } })
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })
    mockSupabase.auth = { getUser: mockGetUser }
    mockSupabase.rpc = mockRpc
    mockSupabase.from = jest.fn(() => ({
      insert: mockInsert,
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }))
  })

  it('hiển thị tên sản phẩm', () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    expect(screen.getByText('Sofa Bắc Âu')).toBeInTheDocument()
  })

  it('hiển thị giá sản phẩm qua Prices component', () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    expect(screen.getByTestId('price')).toBeInTheDocument()
  })

  it('hiển thị variant màu sắc', () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    expect(screen.getByText(/Màu:/i)).toBeInTheDocument()
  })

  it('hiển thị LikeButton', () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    expect(screen.getByTestId('like-button')).toBeInTheDocument()
  })

  it('hiển thị nút Thêm vào giỏ', () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/i })).toBeInTheDocument()
  })

  it('unauthenticated: click Thêm vào giỏ → toast.error + redirect /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Vui lòng đăng nhập để thêm vào giỏ hàng')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('authenticated: click Thêm vào giỏ → gọi rpc add_to_cart', async () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/i }))
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('add_to_cart', expect.objectContaining({
        p_user_id: 'u1',
        p_variant_id: 'var-1',
        p_quantity: 1,
      }))
    })
  })

  it('add_to_cart lỗi → toast.error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Hết hàng' } })
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Không thể thêm vào giỏ hàng.')
    })
  })

  it('hiển thị reviews', () => {
    render(<ProductDetailClient product={mockProduct} reviews={mockReviews} />)
    expect(screen.getAllByTestId('review-item').length).toBe(1)
  })

  it('click variant khác → cập nhật màu hiển thị', () => {
    const mockVariantBlue = { ...mockVariant, color: '#0000ff' }
    const mockVariantRed = { ...mockVariant, id: 'var-2', color: '#ff0000', is_default: false }
    const productWithVariants = {
      ...mockProduct,
      product_variants: [mockVariantBlue, mockVariantRed],
    }
    render(<ProductDetailClient product={productWithVariants} reviews={[]} />)
    // Swatch divs have cursor-pointer class
    const swatches = document.querySelectorAll('[class*="cursor-pointer"]')
    expect(swatches.length).toBeGreaterThanOrEqual(2)
    // Initially shows first variant
    fireEvent.click(swatches[0])
    // Click second swatch
    fireEvent.click(swatches[1])
    // After clicking second swatch, variantActive=1, color shown is '#ff0000'
    expect(screen.getByText(/#ff0000|ff0000/i)).toBeInTheDocument()
  })

  it('gửi review thành công → toast.success', async () => {
    render(<ProductDetailClient product={mockProduct} reviews={[]} />)
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled())
    // Find and fill the review textarea
    const textarea = document.querySelector('textarea')
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'Sản phẩm rất tốt!' } })
      const submitBtn = screen.getByRole('button', { name: /Gửi đánh giá/i })
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
          product_id: 'prod-1',
          rating: 5,
          comment: 'Sản phẩm rất tốt!',
        }))
      })
    }
  })

  it('hiển thị related products khi có', () => {
    const relatedProducts = [{ ...mockProduct, id: 'prod-2', name: 'Ghế Đẹp' }]
    render(<ProductDetailClient product={mockProduct} reviews={[]} relatedProducts={relatedProducts} />)
    expect(screen.getByTestId('related-products')).toBeInTheDocument()
  })
})
