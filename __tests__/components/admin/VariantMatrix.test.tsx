import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn()
const mockUpsertVariants = jest.fn()
const mockDeleteVariant = jest.fn()
const mockToast = jest.fn() as any
mockToast.success = jest.fn()
mockToast.error = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: mockRefresh })),
}))

jest.mock('@/app/(admin)/admin/actions/catalog', () => ({
  upsertVariants: (...args: any[]) => mockUpsertVariants(...args),
  deleteVariant: (...args: any[]) => mockDeleteVariant(...args),
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

import VariantMatrix from '@/components/admin/VariantMatrix'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const materials = [
  { id: 'mat-1', name: 'Gỗ Sồi', slug: 'go-soi', material_type: 'wood' },
  { id: 'mat-2', name: 'Vải Nỉ', slug: 'vai-ni', material_type: 'fabric' },
]

const existingVariants = [
  {
    id: 'var-1',
    name: 'Gỗ Sồi - Trắng',
    sku: 'SKU001',
    price: 5000000,
    color: 'Trắng',
    is_default: true,
    is_active: true,
    inventory: [{ quantity: 10, reserved_quantity: 0 }],
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VariantMatrix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsertVariants.mockResolvedValue({ data: [] })
    mockDeleteVariant.mockResolvedValue({ data: null })
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('render existing variants từ props', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={existingVariants} materials={materials} />)
    expect(screen.getByDisplayValue('Gỗ Sồi - Trắng')).toBeInTheDocument()
    expect(screen.getByDisplayValue('SKU001')).toBeInTheDocument()
  })

  it('hiển thị empty state khi không có variant', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={[]} materials={materials} />)
    expect(screen.getByText(/Chưa có biến thể/i)).toBeInTheDocument()
  })

  it('generate matrix với màu sắc → thêm variant rows mới', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={[]} materials={materials} />)
    const colorTextarea = screen.getByPlaceholderText(/Trắng, Đen/)
    fireEvent.change(colorTextarea, { target: { value: 'Xanh, Đỏ' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo matrix biến thể/ }))
    // name input = 'Xanh', color input also = 'Xanh' → use getAllByDisplayValue
    expect(screen.getAllByDisplayValue('Xanh').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByDisplayValue('Đỏ').length).toBeGreaterThanOrEqual(1)
  })

  it('generate matrix với chất liệu × màu sắc → tạo combinations', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={[]} materials={materials} />)
    const matCheckboxes = screen.getAllByRole('checkbox')
    fireEvent.click(matCheckboxes[0])
    const colorTextarea = screen.getByPlaceholderText(/Trắng, Đen/)
    fireEvent.change(colorTextarea, { target: { value: 'Nâu' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo matrix biến thể/ }))
    // name = 'Gỗ Sồi - Nâu', only one element with this exact name value
    expect(screen.getByDisplayValue('Gỗ Sồi - Nâu')).toBeInTheDocument()
  })

  it('generate matrix không có input → toast.error', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={[]} materials={materials} />)
    fireEvent.click(screen.getByRole('button', { name: /Tạo matrix biến thể/ }))
    expect(mockToast.error).toHaveBeenCalledWith('Chọn ít nhất 1 chất liệu hoặc nhập màu sắc.')
  })

  it('save variants → gọi upsertVariants với đúng payload', async () => {
    render(<VariantMatrix productId="prod-1" existingVariants={existingVariants} materials={materials} />)
    fireEvent.click(screen.getByRole('button', { name: /Lưu tất cả/ }))
    await waitFor(() => {
      expect(mockUpsertVariants).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'var-1', product_id: 'prod-1', name: 'Gỗ Sồi - Trắng' }),
        ])
      )
      expect(mockToast.success).toHaveBeenCalledWith('Đã lưu biến thể!')
    })
  })

  it('save variants lỗi → toast.error', async () => {
    mockUpsertVariants.mockResolvedValue({ error: 'Lỗi lưu variant' })
    render(<VariantMatrix productId="prod-1" existingVariants={existingVariants} materials={materials} />)
    fireEvent.click(screen.getByRole('button', { name: /Lưu tất cả/ }))
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Lỗi lưu variant')
    })
  })

  it('delete existing variant → gọi deleteVariant + cập nhật danh sách', async () => {
    render(<VariantMatrix productId="prod-1" existingVariants={existingVariants} materials={materials} />)
    const deleteBtn = screen.getAllByRole('button').find(
      b => !b.textContent || b.textContent.trim() === ''
    )!
    fireEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDeleteVariant).toHaveBeenCalledWith('var-1', 'prod-1')
    })
  })

  it('remove unsaved variant row → empty state hiển lại', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={[]} materials={materials} />)
    fireEvent.change(screen.getByPlaceholderText(/Trắng, Đen/), { target: { value: 'Cam' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo matrix biến thể/ }))
    expect(screen.getAllByDisplayValue('Cam').length).toBeGreaterThanOrEqual(1)
    // Click delete button (has p-1 text-neutral-400 classes)
    const deleteBtn = document.querySelector('button.p-1') as HTMLElement
    expect(deleteBtn).not.toBeNull()
    fireEvent.click(deleteBtn)
    expect(screen.getByText(/Chưa có biến thể/i)).toBeInTheDocument()
  })

  it('generate matrix thành công → toast.success với số lượng biến thể', () => {
    render(<VariantMatrix productId="prod-1" existingVariants={[]} materials={materials} />)
    fireEvent.change(screen.getByPlaceholderText(/Trắng, Đen/), { target: { value: 'Đỏ, Vàng' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo matrix biến thể/ }))
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('2 biến thể'))
  })
})
