// Client-safe admin constants (no server imports)

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  confirmed: 'Đã xác nhận',
  in_production: 'Đang sản xuất',
  ready_to_ship: 'Sẵn sàng giao',
  shipping_installing: 'Đang giao & lắp',
  completed: 'Đã nghiệm thu',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  processing: 'Đang xử lý',
  shipped: 'Đã giao',
  delivered: 'Đã nhận',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  ready_to_ship: 'bg-indigo-100 text-indigo-800',
  shipping_installing: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
  processing: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-teal-100 text-teal-800',
  delivered: 'bg-emerald-100 text-emerald-800',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  partial_refund: 'Hoàn một phần',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-800',
  partial_refund: 'bg-yellow-100 text-yellow-800',
}

export const VALID_NEXT_STATUSES: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['ready_to_ship'],
  ready_to_ship: ['shipping_installing'],
  shipping_installing: ['completed', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
}
