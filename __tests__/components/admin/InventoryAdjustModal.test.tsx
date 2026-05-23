import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn()
const mockAdjustInventory = jest.fn()
const mockToast = jest.fn() as any
mockToast.success = jest.fn()
mockToast.error = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: mockRefresh, back: jest.fn() })),
}))

jest.mock('@/app/(admin)/admin/actions/inventory', () => ({
  adjustInventory: (...args: any[]) => mockAdjustInventory(...args),
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

import InventoryAdjustModal from '@/components/admin/InventoryAdjustModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  variantId: 'var-1',
  variantName: 'Sofa Bắc Âu - Xanh Navy',
  currentQuantity: 10,
  onClose: jest.fn(),
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InventoryAdjustModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAdjustInventory.mockResolvedValue({ data: null })
  })

  it('hiển thị variant name và current quantity', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    expect(screen.getByText('Sofa Bắc Âu - Xanh Navy')).toBeInTheDocument()
    expect(screen.getByText(/10/)).toBeInTheDocument()
  })

  it('render 3 mode buttons: Nhập / Xuất / Đặt số', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Nhập/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xuất/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đặt số/ })).toBeInTheDocument()
  })

  it('preview add: currentQuantity + amount = 10 + 5 = 15', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '5' } })
    expect(screen.getByText(/15/)).toBeInTheDocument()
  })

  it('preview subtract: currentQuantity - amount = 10 - 3 = 7', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Xuất/ }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '3' } })
    expect(screen.getByText(/7/)).toBeInTheDocument()
  })

  it('preview set: amount = 20', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Đặt số/ }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '20' } })
    expect(screen.getByText(/20/)).toBeInTheDocument()
  })

  it('delta = 0 (set mode, amount = currentQuantity) → toast gọi, không gọi action', async () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Đặt số/ }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Không có thay đổi tồn kho.')
      expect(mockAdjustInventory).not.toHaveBeenCalled()
    })
  })

  it('preview < 0 (subtract > quantity) → submit button bị disabled', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Xuất/ }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '20' } })
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled()
  })

  it('submit thành công → toast.success + router.refresh + onClose', async () => {
    const onClose = jest.fn()
    render(<InventoryAdjustModal {...defaultProps} onClose={onClose} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await waitFor(() => {
      expect(mockAdjustInventory).toHaveBeenCalledWith('var-1', 5, expect.any(String), undefined)
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('10 → 15'))
      expect(mockRefresh).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('submit lỗi → toast.error, không gọi onClose', async () => {
    mockAdjustInventory.mockResolvedValue({ error: 'Tồn kho không đủ' })
    const onClose = jest.fn()
    render(<InventoryAdjustModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Tồn kho không đủ')
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('reason dropdown có 5 options', () => {
    render(<InventoryAdjustModal {...defaultProps} />)
    const select = screen.getByRole('combobox')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(5)
    expect(options[0].textContent).toBe('Nhập kho')
    expect(options[2].textContent).toBe('Hư hỏng')
  })

  it('nút Hủy gọi onClose', () => {
    const onClose = jest.fn()
    render(<InventoryAdjustModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
