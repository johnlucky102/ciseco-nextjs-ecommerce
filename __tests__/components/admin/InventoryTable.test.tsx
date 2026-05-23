import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, refresh: jest.fn() })),
}))

jest.mock('@/components/admin/InventoryAdjustModal', () => ({
  __esModule: true,
  default: ({ variantName, onClose }: any) => (
    <div data-testid="adjust-modal">
      <span>{variantName}</span>
      <button onClick={onClose}>CloseModal</button>
    </div>
  ),
}))

jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)

import InventoryTable from '@/components/admin/InventoryTable'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeRow = (overrides: Partial<any> = {}): any => ({
  id: 'inv-1',
  variant_id: 'var-1',
  quantity: 15,
  reserved_quantity: 2,
  low_stock_threshold: 5,
  last_updated_at: '2024-01-01T00:00:00Z',
  product_variants: {
    id: 'var-1',
    name: 'Sofa Bắc Âu - Xanh',
    sku: 'SKU001',
    price: 5000000,
    color: 'Xanh',
    is_active: true,
    products: { id: 'prod-1', name: 'Sofa Bắc Âu', slug: 'sofa-bac-au' },
  },
  ...overrides,
})

const defaultProps = {
  inventory: [makeRow()],
  count: 1,
  currentPage: 1,
  currentSearch: '',
  currentFilter: '',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InventoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('render tên sản phẩm, variant name, quantity', () => {
    render(<InventoryTable {...defaultProps} />)
    expect(screen.getByText('Sofa Bắc Âu')).toBeInTheDocument()
    expect(screen.getByText(/Sofa Bắc Âu - Xanh/)).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('hiển thị reserved_quantity', () => {
    render(<InventoryTable {...defaultProps} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('KHÔNG hiển thị ⚠ khi quantity > threshold', () => {
    render(<InventoryTable {...defaultProps} />)
    expect(screen.queryByRole('img', { name: /warning/i })).not.toBeInTheDocument()
  })

  it('hiển thị cảnh báo khi quantity <= threshold (row có class màu orange)', () => {
    const row = makeRow({ quantity: 3, reserved_quantity: 0, low_stock_threshold: 5 })
    render(<InventoryTable {...defaultProps} inventory={[row]} />)
    // available = 3 - 0 = 3 <= 5: isLow = true → tr gets bg-orange-50/30
    // Find row via product name to avoid multiple '3' text nodes
    const tr = screen.getByText('Sofa Bắc Âu').closest('tr')
    expect(tr?.className).toContain('bg-orange-50')
  })

  it('click Điều chỉnh → mở InventoryAdjustModal', () => {
    render(<InventoryTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Điều chỉnh/ }))
    const modal = screen.getByTestId('adjust-modal')
    expect(modal).toBeInTheDocument()
    // variantName = product.name + ' – ' + variant.name
    expect(modal.textContent).toMatch(/Sofa Bắc Âu/)
  })

  it('đóng modal khi click CloseModal', () => {
    render(<InventoryTable {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Điều chỉnh/ }))
    expect(screen.getByTestId('adjust-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CloseModal' }))
    expect(screen.queryByTestId('adjust-modal')).not.toBeInTheDocument()
  })

  it('empty state khi inventory = []', () => {
    render(<InventoryTable {...defaultProps} inventory={[]} count={0} />)
    expect(screen.getByText(/Không có dữ liệu|không tìm thấy|Chưa có/i)).toBeInTheDocument()
  })

  it('pagination: hiển thị thông tin trang hiện tại', () => {
    render(<InventoryTable {...defaultProps} count={90} currentPage={2} />)
    expect(screen.getByText(/Trang 2/)).toBeInTheDocument()
  })

  it('link sản phẩm dẫn đến trang edit', () => {
    render(<InventoryTable {...defaultProps} />)
    const productLink = screen.getByRole('link', { name: 'Sofa Bắc Âu' })
    expect(productLink).toHaveAttribute('href', '/admin/products/prod-1/edit')
  })
})
