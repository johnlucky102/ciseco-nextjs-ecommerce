/**
 * Utility functions cho xử lý dữ liệu nội thất
 * - Format tiền VND
 * - Tính giá sale (% giảm)
 * - Format kích thước (Dài × Rộng × Cao)
 */

/**
 * Format số thành tiền VND (ví dụ: 8.500.000 ₫)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Tính phần trăm giảm giá từ giá gốc và giá so sánh
 * @returns phần trăm giảm (0-100), trả về 0 nếu không có sale
 */
export function calculateSalePercent(
  basePrice: number,
  compareAtPrice: number | null | undefined
): number {
  if (!compareAtPrice || compareAtPrice <= basePrice) return 0
  const percent = Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
  return Math.min(percent, 100)
}

/**
 * Tính giá tiết kiệm được (chênh lệch giá gốc và giá so sánh)
 */
export function calculateSavings(
  basePrice: number,
  compareAtPrice: number | null | undefined
): number {
  if (!compareAtPrice || compareAtPrice <= basePrice) return 0
  return compareAtPrice - basePrice
}

export interface Dimensions {
  height: number | null | undefined
  width: number | null | undefined
  depth: number | null | undefined
}

/**
 * Format kích thước sản phẩm nội thất thành chuỗi "Cao × Rộng × Sâu cm"
 * @returns chuỗi dimensions hoặc null nếu không đủ dữ liệu
 */
export function formatDimensions(dims: Dimensions): string | null {
  const { height, width, depth } = dims
  if (!height && !width && !depth) return null

  const parts: string[] = []
  if (height) parts.push(`C ${height}`)
  if (width) parts.push(`R ${width}`)
  if (depth) parts.push(`S ${depth}`)

  return parts.join(' × ') + ' cm'
}

/**
 * Parse JSON kích thước từ chuỗi "DxRxC" hoặc "D×R×C"
 * @returns Dimensions object
 */
export function parseDimensionString(dimString: string): Dimensions {
  const cleaned = dimString.replace(/[×x]/gi, '|')
  const parts = cleaned.split('|').map((s) => parseFloat(s.trim()))

  return {
    height: isNaN(parts[0]) ? null : parts[0],
    width: isNaN(parts[1]) ? null : parts[1],
    depth: isNaN(parts[2]) ? null : parts[2],
  }
}

/**
 * Kiểm tra sản phẩm có phải "kích thước lớn" (cần xe tải giao hàng)
 * Tiêu chí: bất kỳ chiều nào > 150cm hoặc tổng 3 chiều > 300cm
 */
export function isOversizedFurniture(dims: Dimensions): boolean {
  const h = dims.height ?? 0
  const w = dims.width ?? 0
  const d = dims.depth ?? 0

  if (h > 150 || w > 150 || d > 150) return true
  if (h + w + d > 300) return true
  return false
}
