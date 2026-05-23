import {
  formatVND,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  VALID_NEXT_STATUSES,
} from '@/lib/admin-constants'

// ─── formatVND ─────────────────────────────────────────────────────────────────

describe('formatVND', () => {
  it('format giá nội thất thông dụng 8.500.000₫', () => {
    const result = formatVND(8500000)
    expect(result).toContain('8.500.000')
    expect(result).toMatch(/₫/)
  })

  it('format giá 0₫', () => {
    expect(formatVND(0)).toMatch(/₫/)
    expect(formatVND(0)).toMatch(/0/)
  })

  it('format giá thập phân → làm tròn (maximumFractionDigits: 0)', () => {
    expect(formatVND(1999999.5)).toContain('2.000.000')
  })

  it('format giá lớn 100 triệu', () => {
    const result = formatVND(100000000)
    expect(result).toContain('100.000.000')
    expect(result).toMatch(/₫/)
  })

  it('format số âm', () => {
    const result = formatVND(-500000)
    expect(result).toMatch(/₫/)
    expect(result).toContain('500.000')
  })
})

// ─── ORDER_STATUS_LABELS ────────────────────────────────────────────────────────

describe('ORDER_STATUS_LABELS', () => {
  const requiredStatuses = [
    'pending', 'confirmed', 'in_production', 'ready_to_ship',
    'shipping_installing', 'completed', 'cancelled', 'refunded',
    'processing', 'shipped', 'delivered',
  ]

  it.each(requiredStatuses)('có label cho trạng thái "%s"', (status) => {
    expect(ORDER_STATUS_LABELS[status]).toBeDefined()
    expect(ORDER_STATUS_LABELS[status].length).toBeGreaterThan(0)
  })

  it('pending = "Chờ duyệt"', () => {
    expect(ORDER_STATUS_LABELS['pending']).toBe('Chờ duyệt')
  })

  it('completed = "Đã nghiệm thu"', () => {
    expect(ORDER_STATUS_LABELS['completed']).toBe('Đã nghiệm thu')
  })

  it('cancelled = "Đã hủy"', () => {
    expect(ORDER_STATUS_LABELS['cancelled']).toBe('Đã hủy')
  })

  it('label không phải toàn tiếng Anh (đã dịch sang tiếng Việt)', () => {
    const allAscii = /^[\x00-\x7F]+$/
    const vietnameseStatuses = ['pending', 'confirmed', 'in_production', 'completed', 'cancelled']
    vietnameseStatuses.forEach((s) => {
      expect(ORDER_STATUS_LABELS[s]).not.toMatch(allAscii)
    })
  })
})

// ─── ORDER_STATUS_COLORS ────────────────────────────────────────────────────────

describe('ORDER_STATUS_COLORS', () => {
  it('mỗi status có class Tailwind bg + text', () => {
    Object.values(ORDER_STATUS_COLORS).forEach((color) => {
      expect(color).toMatch(/bg-\w+-\d+/)
      expect(color).toMatch(/text-\w+-\d+/)
    })
  })

  it('labels và colors đồng bộ keys', () => {
    expect(Object.keys(ORDER_STATUS_LABELS).sort()).toEqual(
      Object.keys(ORDER_STATUS_COLORS).sort()
    )
  })

  it('completed có màu xanh lá (thành công)', () => {
    expect(ORDER_STATUS_COLORS['completed']).toContain('green')
  })

  it('cancelled có màu đỏ (nguy hiểm)', () => {
    expect(ORDER_STATUS_COLORS['cancelled']).toContain('red')
  })

  it('pending có màu vàng (chờ đợi)', () => {
    expect(ORDER_STATUS_COLORS['pending']).toContain('yellow')
  })
})

// ─── VALID_NEXT_STATUSES — Order State Machine ──────────────────────────────────

describe('VALID_NEXT_STATUSES — Order State Machine', () => {
  it('pending → confirmed hoặc cancelled (2 options)', () => {
    expect(VALID_NEXT_STATUSES['pending']).toContain('confirmed')
    expect(VALID_NEXT_STATUSES['pending']).toContain('cancelled')
    expect(VALID_NEXT_STATUSES['pending'].length).toBe(2)
  })

  it('confirmed → in_production hoặc cancelled', () => {
    expect(VALID_NEXT_STATUSES['confirmed']).toContain('in_production')
    expect(VALID_NEXT_STATUSES['confirmed']).toContain('cancelled')
  })

  it('in_production → chỉ ready_to_ship (không thể hủy khi đang sản xuất)', () => {
    expect(VALID_NEXT_STATUSES['in_production']).toEqual(['ready_to_ship'])
    expect(VALID_NEXT_STATUSES['in_production']).not.toContain('cancelled')
  })

  it('ready_to_ship → shipping_installing', () => {
    expect(VALID_NEXT_STATUSES['ready_to_ship']).toContain('shipping_installing')
  })

  it('shipping_installing → completed hoặc cancelled', () => {
    expect(VALID_NEXT_STATUSES['shipping_installing']).toContain('completed')
    expect(VALID_NEXT_STATUSES['shipping_installing']).toContain('cancelled')
  })

  it('processing → shipped hoặc cancelled', () => {
    expect(VALID_NEXT_STATUSES['processing']).toContain('shipped')
    expect(VALID_NEXT_STATUSES['processing']).toContain('cancelled')
  })

  it('shipped → delivered', () => {
    expect(VALID_NEXT_STATUSES['shipped']).toContain('delivered')
  })

  it('completed → terminal (undefined, không có bước tiếp theo)', () => {
    expect(VALID_NEXT_STATUSES['completed']).toBeUndefined()
  })

  it('cancelled → terminal', () => {
    expect(VALID_NEXT_STATUSES['cancelled']).toBeUndefined()
  })

  it('refunded → terminal', () => {
    expect(VALID_NEXT_STATUSES['refunded']).toBeUndefined()
  })

  it('delivered → terminal', () => {
    expect(VALID_NEXT_STATUSES['delivered']).toBeUndefined()
  })

  it('không cho nhảy từ pending → completed (phải qua đủ bước)', () => {
    expect(VALID_NEXT_STATUSES['pending']).not.toContain('completed')
    expect(VALID_NEXT_STATUSES['pending']).not.toContain('in_production')
    expect(VALID_NEXT_STATUSES['pending']).not.toContain('shipping_installing')
  })

  it('không cho nhảy từ confirmed → shipping_installing', () => {
    expect(VALID_NEXT_STATUSES['confirmed']).not.toContain('shipping_installing')
    expect(VALID_NEXT_STATUSES['confirmed']).not.toContain('completed')
  })
})

// ─── PAYMENT_STATUS ─────────────────────────────────────────────────────────────

describe('PAYMENT_STATUS_LABELS & COLORS', () => {
  const requiredPayments = ['unpaid', 'paid', 'refunded', 'partial_refund']

  it.each(requiredPayments)('có label tiếng Việt cho "%s"', (status) => {
    expect(PAYMENT_STATUS_LABELS[status]).toBeDefined()
    expect(PAYMENT_STATUS_LABELS[status].length).toBeGreaterThan(0)
  })

  it.each(requiredPayments)('có Tailwind class cho "%s"', (status) => {
    expect(PAYMENT_STATUS_COLORS[status]).toBeDefined()
    expect(PAYMENT_STATUS_COLORS[status]).toMatch(/bg-\w+-\d+/)
  })

  it('payment labels và colors đồng bộ keys', () => {
    expect(Object.keys(PAYMENT_STATUS_LABELS).sort()).toEqual(
      Object.keys(PAYMENT_STATUS_COLORS).sort()
    )
  })

  it('unpaid có màu đỏ (chưa thanh toán = cảnh báo)', () => {
    expect(PAYMENT_STATUS_COLORS['unpaid']).toContain('red')
  })

  it('paid có màu xanh lá (đã thanh toán = thành công)', () => {
    expect(PAYMENT_STATUS_COLORS['paid']).toContain('green')
  })

  it('paid = "Đã thanh toán"', () => {
    expect(PAYMENT_STATUS_LABELS['paid']).toBe('Đã thanh toán')
  })

  it('unpaid = "Chưa thanh toán"', () => {
    expect(PAYMENT_STATUS_LABELS['unpaid']).toBe('Chưa thanh toán')
  })
})
