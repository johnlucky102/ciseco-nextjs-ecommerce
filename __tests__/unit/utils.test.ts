/**
 * Unit Tests: Hàm xử lý dữ liệu nội thất
 * - formatVND: format tiền tệ Việt Nam
 * - calculateSalePercent: tính % giảm giá
 * - calculateSavings: tính số tiền tiết kiệm
 * - formatDimensions: format kích thước (Cao × Rộng × Sâu)
 * - parseDimensionString: parse chuỗi kích thước
 * - isOversizedFurniture: kiểm tra sản phẩm quá khổ
 */

import {
  formatVND,
  calculateSalePercent,
  calculateSavings,
  formatDimensions,
  parseDimensionString,
  isOversizedFurniture,
} from '@/lib/furniture-utils'

// ─── formatVND ─────────────────────────────────────────────────────────────────

describe('formatVND', () => {
  it('format giá sản phẩm nội thất chuẩn VND', () => {
    const result = formatVND(8500000)
    // Kiểm tra chứa số 8.500.000 và ký hiệu tiền tệ
    expect(result).toContain('8.500.000')
    expect(result).toMatch(/₫/)
  })

  it('format giá 0 VND', () => {
    const result = formatVND(0)
    expect(result).toContain('0')
    expect(result).toMatch(/₫/)
  })

  it('format giá nhỏ (phụ kiện)', () => {
    const result = formatVND(150000)
    expect(result).toContain('150.000')
  })

  it('format giá lớn (bộ nội thất cao cấp)', () => {
    const result = formatVND(150000000)
    expect(result).toContain('150.000.000')
  })

  it('format số âm (trường hợp hoàn tiền)', () => {
    const result = formatVND(-500000)
    expect(result).toContain('500.000')
  })
})

// ─── calculateSalePercent ──────────────────────────────────────────────────────

describe('calculateSalePercent', () => {
  it('tính đúng % giảm giá cho sofa (8.5M vs 9.5M)', () => {
    const percent = calculateSalePercent(8500000, 9500000)
    // (9.5M - 8.5M) / 9.5M * 100 ≈ 10.5% → round = 11%
    expect(percent).toBe(11)
  })

  it('tính đúng % giảm cho bàn ăn (12.5M vs 14M)', () => {
    const percent = calculateSalePercent(12500000, 14000000)
    // (14M - 12.5M) / 14M * 100 ≈ 10.7% → round = 11%
    expect(percent).toBe(11)
  })

  it('trả về 0 khi không có giá so sánh (null)', () => {
    expect(calculateSalePercent(8500000, null)).toBe(0)
  })

  it('trả về 0 khi không có giá so sánh (undefined)', () => {
    expect(calculateSalePercent(8500000, undefined)).toBe(0)
  })

  it('trả về 0 khi giá so sánh <= giá bán', () => {
    expect(calculateSalePercent(8500000, 8500000)).toBe(0)
    expect(calculateSalePercent(8500000, 7000000)).toBe(0)
  })

  it('không vượt quá 100%', () => {
    // Edge case: giá bán = 0, giá so sánh = 10M
    expect(calculateSalePercent(0, 10000000)).toBe(100)
  })
})

// ─── calculateSavings ──────────────────────────────────────────────────────────

describe('calculateSavings', () => {
  it('tính đúng tiền tiết kiệm cho sofa', () => {
    expect(calculateSavings(8500000, 9500000)).toBe(1000000)
  })

  it('trả về 0 khi không có sale', () => {
    expect(calculateSavings(8500000, null)).toBe(0)
    expect(calculateSavings(8500000, undefined)).toBe(0)
    expect(calculateSavings(8500000, 8500000)).toBe(0)
  })
})

// ─── formatDimensions ──────────────────────────────────────────────────────────

describe('formatDimensions', () => {
  it('format đầy đủ 3 chiều (sofa: 85×220×95)', () => {
    const result = formatDimensions({ height: 85, width: 220, depth: 95 })
    expect(result).toBe('C 85 × R 220 × S 95 cm')
  })

  it('format giường king (110×200×210)', () => {
    const result = formatDimensions({ height: 110, width: 200, depth: 210 })
    expect(result).toBe('C 110 × R 200 × S 210 cm')
  })

  it('format khi chỉ có 1 chiều', () => {
    const result = formatDimensions({ height: 120, width: null, depth: null })
    expect(result).toBe('C 120 cm')
  })

  it('format khi có 2 chiều', () => {
    const result = formatDimensions({ height: null, width: 100, depth: 55 })
    expect(result).toBe('R 100 × S 55 cm')
  })

  it('trả về null khi không có dữ liệu kích thước', () => {
    expect(formatDimensions({ height: null, width: null, depth: null })).toBeNull()
    expect(formatDimensions({ height: undefined, width: undefined, depth: undefined })).toBeNull()
  })

  it('xử lý giá trị 0 (coi như null)', () => {
    expect(formatDimensions({ height: 0, width: 0, depth: 0 })).toBeNull()
  })
})

// ─── parseDimensionString ──────────────────────────────────────────────────────

describe('parseDimensionString', () => {
  it('parse chuỗi "85x220x95" (dấu x thường)', () => {
    const dims = parseDimensionString('85x220x95')
    expect(dims).toEqual({ height: 85, width: 220, depth: 95 })
  })

  it('parse chuỗi "85×220×95" (dấu × unicode)', () => {
    const dims = parseDimensionString('85×220×95')
    expect(dims).toEqual({ height: 85, width: 220, depth: 95 })
  })

  it('parse chuỗi có khoảng trắng "85 x 220 x 95"', () => {
    const dims = parseDimensionString('85 x 220 x 95')
    expect(dims).toEqual({ height: 85, width: 220, depth: 95 })
  })

  it('parse chuỗi rỗng → trả null cho tất cả', () => {
    const dims = parseDimensionString('')
    expect(dims.height).toBeNull()
    expect(dims.width).toBeNull()
    expect(dims.depth).toBeNull()
  })

  it('parse số thập phân', () => {
    const dims = parseDimensionString('85.5x220.3x95.1')
    expect(dims).toEqual({ height: 85.5, width: 220.3, depth: 95.1 })
  })
})

// ─── isOversizedFurniture ──────────────────────────────────────────────────────

describe('isOversizedFurniture', () => {
  it('giường king (110×200×210) → quá khổ (width > 150)', () => {
    expect(isOversizedFurniture({ height: 110, width: 200, depth: 210 })).toBe(true)
  })

  it('tủ quần áo (200×120×60) → quá khổ (height > 150)', () => {
    expect(isOversizedFurniture({ height: 200, width: 120, depth: 60 })).toBe(true)
  })

  it('bàn cà phê (45×100×55) → không quá khổ', () => {
    expect(isOversizedFurniture({ height: 45, width: 100, depth: 55 })).toBe(false)
  })

  it('ghế văn phòng (120×65×65) → không quá khổ (sum=250 < 300)', () => {
    expect(isOversizedFurniture({ height: 120, width: 65, depth: 65 })).toBe(false)
  })

  it('sofa (85×220×95) → quá khổ (width > 150)', () => {
    expect(isOversizedFurniture({ height: 85, width: 220, depth: 95 })).toBe(true)
  })

  it('kệ sách nhỏ (105×80×30) → không quá khổ', () => {
    expect(isOversizedFurniture({ height: 105, width: 80, depth: 30 })).toBe(false)
  })

  it('xử lý null dimensions → không quá khổ', () => {
    expect(isOversizedFurniture({ height: null, width: null, depth: null })).toBe(false)
  })
})
