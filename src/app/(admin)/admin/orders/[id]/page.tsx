import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  getAdminOrderDetail, getInstallationTeams, getDeliveryVehicles,
  formatVND, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from '@/lib/supabase/admin'
import OrderStatusActions from '@/components/admin/OrderStatusActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const [order, teams, vehicles] = await Promise.all([
    getAdminOrderDetail(id),
    getInstallationTeams(),
    getDeliveryVehicles(),
  ])

  if (!order) notFound()

  const profile = order.profiles as any

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin/orders" className="hover:text-neutral-800">Đơn hàng</Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-neutral-800 font-medium font-mono">#{order.order_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Đơn hàng #{order.order_number}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {new Date(order.created_at).toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800'}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${PAYMENT_STATUS_COLORS[order.payment_status] ?? 'bg-gray-100 text-gray-800'}`}>
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: order details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order items */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">Sản phẩm đặt hàng</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left pb-2 text-neutral-500 font-medium">Sản phẩm</th>
                  <th className="text-right pb-2 text-neutral-500 font-medium">Đơn giá</th>
                  <th className="text-right pb-2 text-neutral-500 font-medium">SL</th>
                  <th className="text-right pb-2 text-neutral-500 font-medium">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items?.map(item => (
                  <tr key={item.id} className="border-b border-neutral-50">
                    <td className="py-2.5">
                      <p className="font-medium text-neutral-800">{item.product_name}</p>
                      {item.variant_name && <p className="text-xs text-neutral-400">{item.variant_name}</p>}
                    </td>
                    <td className="py-2.5 text-right text-neutral-600">{formatVND(item.price)}</td>
                    <td className="py-2.5 text-right text-neutral-600">×{item.quantity}</td>
                    <td className="py-2.5 text-right font-medium text-neutral-800">{formatVND(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-100">
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-neutral-500 text-xs">Tổng cộng</td>
                  <td className="pt-3 text-right font-bold text-neutral-900 text-base">{formatVND(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Status timeline */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">Lịch sử trạng thái</h2>
            {(!order.order_status_events || order.order_status_events.length === 0) ? (
              <p className="text-sm text-neutral-400">Chưa có sự kiện nào</p>
            ) : (
              <ol className="relative border-l border-neutral-200 ml-3 space-y-4">
                {[...order.order_status_events].reverse().map(event => (
                  <li key={event.id} className="ml-4">
                    <div className="absolute w-3 h-3 bg-neutral-300 rounded-full -left-1.5 border border-white" />
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          {event.from_status
                            ? `${ORDER_STATUS_LABELS[event.from_status] ?? event.from_status} → ${ORDER_STATUS_LABELS[event.to_status] ?? event.to_status}`
                            : ORDER_STATUS_LABELS[event.to_status] ?? event.to_status
                          }
                        </p>
                        {event.note && <p className="text-xs text-neutral-500 mt-0.5">{event.note}</p>}
                      </div>
                      <span className="text-xs text-neutral-400 flex-shrink-0 ml-3">
                        {new Date(event.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Shipping info */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">Thông tin giao hàng</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-neutral-500">Người nhận</p>
                <p className="font-medium text-neutral-800">{order.shipping_full_name}</p>
              </div>
              <div>
                <p className="text-neutral-500">Số điện thoại</p>
                <p className="font-medium text-neutral-800">{order.shipping_phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-neutral-500">Địa chỉ</p>
                <p className="font-medium text-neutral-800">
                  {[order.shipping_address_line1, order.shipping_address_line2, order.shipping_city, order.shipping_state_province]
                    .filter(Boolean).join(', ')}
                </p>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-neutral-500">Ghi chú khách hàng</p>
                  <p className="text-neutral-800 italic">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: actions */}
        <div className="space-y-5">
          {/* Customer info */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="font-semibold text-neutral-800 mb-3">Khách hàng</h2>
            <p className="text-sm font-medium text-neutral-800">{profile?.full_name ?? order.shipping_full_name}</p>
            <p className="text-xs text-neutral-500">{profile?.email ?? '—'}</p>
          </div>

          {/* Status + Logistics actions */}
          <OrderStatusActions
            orderId={order.id}
            currentStatus={order.status}
            currentPaymentStatus={order.payment_status}
            fulfillment={order.order_fulfillments}
            teams={teams}
            vehicles={vehicles}
          />
        </div>
      </div>
    </div>
  )
}
