import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn()
const mockUpdateOrderStatus = jest.fn()
const mockUpsertOrderFulfillment = jest.fn()
const mockUpdatePaymentStatus = jest.fn()
const mockToast = jest.fn() as any
mockToast.success = jest.fn()
mockToast.error = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: mockRefresh })),
}))

jest.mock('@/app/(admin)/admin/actions/orders', () => ({
  updateOrderStatus: (...args: any[]) => mockUpdateOrderStatus(...args),
  upsertOrderFulfillment: (...args: any[]) => mockUpsertOrderFulfillment(...args),
  updatePaymentStatus: (...args: any[]) => mockUpdatePaymentStatus(...args),
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

import OrderStatusActions from '@/components/admin/OrderStatusActions'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const defaultProps = {
  orderId: 'order-1',
  currentStatus: 'pending',
  currentPaymentStatus: 'unpaid',
  fulfillment: null,
  teams: [{ id: 't1', name: 'Team A', leader_name: 'Nguyễn Văn A', phone: '0901234567' }],
  vehicles: [{ id: 'v1', license_plate: '51A-12345', vehicle_type: 'Xe tải' }],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrderStatusActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateOrderStatus.mockResolvedValue({ data: {} })
    mockUpsertOrderFulfillment.mockResolvedValue({ data: {} })
    mockUpdatePaymentStatus.mockResolvedValue({ data: {} })
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('status "pending" → hiển thị button Xác nhận và Hủy', () => {
    render(<OrderStatusActions {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Đã xác nhận|Xác nhận/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đã hủy|Huỷ|Hủy/ })).toBeInTheDocument()
  })

  it('status "delivered" → không hiển thị button chuyển trạng thái', () => {
    render(<OrderStatusActions {...defaultProps} currentStatus="delivered" />)
    expect(screen.queryByRole('button', { name: /Chuyển|Xác nhận|Giao hàng/ })).not.toBeInTheDocument()
  })

  it('status "cancelled" → không hiển thị button chuyển trạng thái', () => {
    render(<OrderStatusActions {...defaultProps} currentStatus="cancelled" />)
    const container = screen.queryByText('Chuyển trạng thái')
    expect(container).not.toBeInTheDocument()
  })

  it('click status button → confirm dialog → gọi updateOrderStatus', async () => {
    render(<OrderStatusActions {...defaultProps} />)
    const confirmBtn = screen.getAllByRole('button').find(
      b => b.textContent?.includes('Đã xác nhận') || b.textContent?.includes('Xác nhận')
    )!
    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'confirmed', undefined)
    })
  })

  it('updateOrderStatus thành công → toast.success + router.refresh', async () => {
    render(<OrderStatusActions {...defaultProps} />)
    const btn = screen.getAllByRole('button').find(b => b.textContent?.includes('Đã xác nhận'))!
    fireEvent.click(btn)
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('Đã chuyển sang'))
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('updateOrderStatus lỗi → toast.error', async () => {
    mockUpdateOrderStatus.mockResolvedValue({ error: 'Không hợp lệ' })
    render(<OrderStatusActions {...defaultProps} />)
    const btn = screen.getAllByRole('button').find(b => b.textContent?.includes('Đã xác nhận'))!
    fireEvent.click(btn)
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Không hợp lệ')
    })
  })

  it('note field: truyền note vào updateOrderStatus', async () => {
    render(<OrderStatusActions {...defaultProps} />)
    const noteInput = screen.getByPlaceholderText(/Lý do, ghi chú/i)
    fireEvent.change(noteInput, { target: { value: 'Khách đã thanh toán' } })
    const btn = screen.getAllByRole('button').find(b => b.textContent?.includes('Đã xác nhận'))!
    fireEvent.click(btn)
    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'confirmed', 'Khách đã thanh toán')
    })
  })

  it('hiển thị payment status select', () => {
    render(<OrderStatusActions {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('thay đổi payment status → confirm → updatePaymentStatus', async () => {
    render(<OrderStatusActions {...defaultProps} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'paid' } })
    await waitFor(() => {
      expect(mockUpdatePaymentStatus).toHaveBeenCalledWith('order-1', 'paid')
    })
  })

  it('updatePaymentStatus thành công → toast.success + router.refresh', async () => {
    render(<OrderStatusActions {...defaultProps} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'paid' } })
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Đã cập nhật trạng thái thanh toán')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('Logistics section: click Chỉnh sửa → mở form', () => {
    render(<OrderStatusActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa/ }))
    expect(screen.getByRole('button', { name: /Lưu logistics/ })).toBeInTheDocument()
  })

  it('submit logistics form → gọi upsertOrderFulfillment', async () => {
    render(<OrderStatusActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa/ }))
    fireEvent.click(screen.getByRole('button', { name: /Lưu logistics/ }))
    await waitFor(() => {
      expect(mockUpsertOrderFulfillment).toHaveBeenCalledWith('order-1', expect.any(Object))
    })
  })

  it('upsertOrderFulfillment lỗi → toast.error', async () => {
    mockUpsertOrderFulfillment.mockResolvedValue({ error: 'Lỗi lưu logistics' })
    render(<OrderStatusActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa/ }))
    fireEvent.click(screen.getByRole('button', { name: /Lưu logistics/ }))
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Lỗi lưu logistics')
    })
  })
})
