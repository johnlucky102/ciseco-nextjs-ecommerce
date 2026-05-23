import Link from 'next/link'
import { getAdminOrders, formatVND, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/supabase/admin'

interface PageProps {
  searchParams: Promise<{ status?: string; payment_status?: string; search?: string; page?: string }>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const { data: orders, count } = await getAdminOrders({
    status: params.status,
    payment_status: params.payment_status,
    search: params.search,
    page,
    pageSize: 25,
  })
  const totalPages = Math.ceil((count ?? 0) / 25)

  const statusList = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'in_production', label: 'Sản xuất' },
    { value: 'ready_to_ship', label: 'Sẵn giao' },
    { value: 'shipping_installing', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
  ]

  function buildQuery(overrides: Record<string, string>) {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.payment_status) q.set('payment_status', params.payment_status)
    if (params.search) q.set('search', params.search)
    Object.entries(overrides).forEach(([k, v]) => { if (v) q.set(k, v); else q.delete(k) })
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Đơn hàng</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{count} đơn hàng</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status quick filter */}
        <div className="flex gap-2 flex-wrap">
          {statusList.map(s => (
            <Link key={s.value}
              href={`/admin/orders${buildQuery({ status: s.value, page: '1' })}` as any}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                (params.status ?? '') === s.value
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        <form className="flex items-center gap-3">
          <input name="search" defaultValue={params.search}
            placeholder="Tìm mã đơn, SĐT, tên khách..."
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors">
            Tìm
          </button>
          {params.search && (
            <Link href={`/admin/orders${buildQuery({ search: '', page: '1' })}` as any} className="text-sm text-neutral-500 hover:text-neutral-800">
              Xóa tìm kiếm
            </Link>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Mã đơn</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium hidden md:table-cell">Khách hàng</th>
              <th className="text-center px-4 py-3 text-neutral-500 font-medium">Trạng thái</th>
              <th className="text-center px-4 py-3 text-neutral-500 font-medium hidden lg:table-cell">Thanh toán</th>
              <th className="text-right px-4 py-3 text-neutral-500 font-medium">Tổng tiền</th>
              <th className="text-right px-4 py-3 text-neutral-500 font-medium hidden lg:table-cell">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-neutral-400">Không có đơn hàng nào</td></tr>
            )}
            {orders.map(order => (
              <tr key={order.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-neutral-800">
                  #{order.order_number}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="font-medium text-neutral-800">{order.shipping_full_name ?? '—'}</p>
                  <p className="text-xs text-neutral-400">{order.shipping_phone ?? (order.profiles as any)?.email ?? ''}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[order.payment_status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-800">
                  {formatVND(order.total)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-400 text-xs hidden lg:table-cell">
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                    Chi tiết →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/orders${buildQuery({ page: String(page - 1) })}` as any}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">
              ← Trước
            </Link>
          )}
          <span className="text-sm text-neutral-500">Trang {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/orders${buildQuery({ page: String(page + 1) })}` as any}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">
              Sau →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
