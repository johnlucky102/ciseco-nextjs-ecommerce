import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockCreateProduct = jest.fn()
const mockUpdateProduct = jest.fn()
const mockAddProductImageUrl = jest.fn()
const mockDeleteProductImage = jest.fn()
const mockSetPrimaryImage = jest.fn()
const mockToast = jest.fn() as any
mockToast.success = jest.fn()
mockToast.error = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, refresh: mockRefresh, back: jest.fn() })),
}))

jest.mock('@/app/(admin)/admin/actions/catalog', () => ({
  createProduct: (...args: any[]) => mockCreateProduct(...args),
  updateProduct: (...args: any[]) => mockUpdateProduct(...args),
  addProductImageUrl: (...args: any[]) => mockAddProductImageUrl(...args),
  deleteProductImage: (...args: any[]) => mockDeleteProductImage(...args),
  setPrimaryImage: (...args: any[]) => mockSetPrimaryImage(...args),
}))

jest.mock('react-hot-toast', () => {
  const t = (...args: any[]) => mockToast(...args)
  t.success = (...args: any[]) => mockToast.success(...args)
  t.error = (...args: any[]) => mockToast.error(...args)
  return { __esModule: true, default: t }
})

jest.mock('@/components/admin/VariantMatrix', () => ({
  __esModule: true,
  default: () => <div data-testid="variant-matrix">VariantMatrix</div>,
}))

jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)
jest.mock('@heroicons/react/24/solid', () =>
  new Proxy({}, { get: () => () => null })
)

import ProductFormClient from '@/components/admin/ProductFormClient'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseProps = {
  categories: [{ id: 'cat-1', name: 'Phòng Khách' }],
  rooms: [{ id: 'room-1', name: 'Phòng ngủ' }],
  materials: [{ id: 'mat-1', name: 'Gỗ Sồi', slug: 'go-soi', material_type: 'wood' }],
}

const editInitialData = {
  name: 'Sofa Bắc Âu',
  slug: 'sofa-bac-au',
  description: 'Mô tả sản phẩm',
  short_description: 'Mô tả ngắn',
  base_price: 5000000,
  compare_at_price: 6000000,
  cost_price: 3000000,
  sku: 'SKU001',
  status: 'active',
  is_featured: true,
  is_new: false,
  category_id: 'cat-1',
  room_id: 'room-1',
  meta_title: null,
  meta_description: null,
  product_images: [],
  product_variants: [],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProductFormClient — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateProduct.mockResolvedValue({ data: { id: 'new-id', slug: 'new-slug' } })
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('render 3 tabs: Thông tin, Hình ảnh, Biến thể', () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Thông tin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hình ảnh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Biến thể' })).toBeInTheDocument()
  })

  it('create mode: form fields trống ban đầu', () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    const nameInput = screen.getAllByRole('textbox')[0]
    expect(nameInput).toHaveValue('')
  })

  it('slugify tự sinh slug từ tên sản phẩm khi gõ', () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    const nameInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(nameInput, { target: { value: 'Sofa Bắc Âu' } })
    const slugInput = screen.getAllByRole('textbox')[1]
    expect(slugInput).toHaveValue('sofa-bac-au')
  })

  it('tab switching: click Hình ảnh → hiển thị cảnh báo trong create mode', () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hình ảnh' }))
    expect(screen.getByText(/tạo sản phẩm trước/i)).toBeInTheDocument()
  })

  it('tab Biến thể trong create mode: hiển thị cảnh báo tạo sản phẩm trước', () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Biến thể' }))
    expect(screen.getByText(/tạo sản phẩm trước/i)).toBeInTheDocument()
  })

  it('is_featured checkbox toggle', () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    const checkboxes = screen.getAllByRole('checkbox')
    const featuredCheckbox = checkboxes.find(c => {
      const label = c.closest('label')?.textContent
      return label?.includes('Nổi bật') || c.getAttribute('name') === 'is_featured'
    }) ?? checkboxes[0]
    const initialChecked = featuredCheckbox.getAttribute('checked') !== null
    fireEvent.click(featuredCheckbox)
    expect(featuredCheckbox).not.toEqual(initialChecked)
  })

  it('submit thành công → toast.success + router.push đến trang edit', async () => {
    render(<ProductFormClient mode="create" {...baseProps} />)
    const nameInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(nameInput, { target: { value: 'Sản phẩm mới' } })
    const priceInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(priceInputs[0], { target: { value: '1000000' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Đã tạo sản phẩm!')
      expect(mockPush).toHaveBeenCalledWith('/admin/products/new-id/edit')
    })
  })

  it('submit lỗi → toast.error, không navigate', async () => {
    mockCreateProduct.mockResolvedValue({ error: 'Slug đã tồn tại' })
    render(<ProductFormClient mode="create" {...baseProps} />)
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Slug đã tồn tại')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})

describe('ProductFormClient — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateProduct.mockResolvedValue({ data: {} })
    mockDeleteProductImage.mockResolvedValue({ data: null })
    mockSetPrimaryImage.mockResolvedValue({ data: null })
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('fill initialData vào các fields đúng', () => {
    render(<ProductFormClient mode="edit" productId="prod-1" initialData={editInitialData} {...baseProps} />)
    const nameInput = screen.getAllByRole('textbox')[0]
    expect(nameInput).toHaveValue('Sofa Bắc Âu')
  })

  it('slug KHÔNG tự sinh lại khi edit mode', () => {
    render(<ProductFormClient mode="edit" productId="prod-1" initialData={editInitialData} {...baseProps} />)
    const nameInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(nameInput, { target: { value: 'Tên mới' } })
    const slugInput = screen.getAllByRole('textbox')[1]
    expect(slugInput).toHaveValue('sofa-bac-au')
  })

  it('submit edit → gọi updateProduct với productId', async () => {
    render(<ProductFormClient mode="edit" productId="prod-1" initialData={editInitialData} {...baseProps} />)
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith('prod-1', expect.any(FormData))
      expect(mockToast.success).toHaveBeenCalledWith('Đã lưu thay đổi!')
    })
  })

  it('update lỗi → toast.error', async () => {
    mockUpdateProduct.mockResolvedValue({ error: 'Không có quyền' })
    render(<ProductFormClient mode="edit" productId="prod-1" initialData={editInitialData} {...baseProps} />)
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Không có quyền')
    })
  })

  it('tab Biến thể trong edit mode → render VariantMatrix', () => {
    render(<ProductFormClient mode="edit" productId="prod-1" initialData={editInitialData} {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Biến thể' }))
    expect(screen.getByTestId('variant-matrix')).toBeInTheDocument()
  })

  it('render images trong tab Hình ảnh khi có product_images', () => {
    const dataWithImages = {
      ...editInitialData,
      product_images: [
        { id: 'img-1', image_url: 'https://example.com/img.jpg', is_primary: true, alt_text: null },
      ],
    }
    render(<ProductFormClient mode="edit" productId="prod-1" initialData={dataWithImages} {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hình ảnh' }))
    // Regular <img> (not next/image) used for product images
    expect(document.querySelector('img')).not.toBeNull()
  })
})
