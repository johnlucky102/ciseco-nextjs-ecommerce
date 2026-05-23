import Link from 'next/link'
import {
  getAdminDashboardKPI,
  getAdminRecentOrders,
  getAdminLowStock,
  getAdminTopProducts,
  formatVND,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '@/lib/supabase/admin'
import {
  BanknotesIcon,
  ShoppingBagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-neutral-500">{title}</p>
        <p className="text-xl font-bold text-neutral-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const [kpi, recentOrders, lowStock, topProducts] = await Promise.all([
    getAdminDashboardKPI(),
    getAdminRecentOrders(8),
    getAdminLowStock(),
    getAdminTopProducts(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Tổng quan hoạt động kinh doanh</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Doanh thu hôm nay"
          value={formatVND(kpi?.revenue_today ?? 0)}
          subtitle={`Tháng này: ${formatVND(kpi?.revenue_this_month ?? 0)}`}
          icon={BanknotesIcon}
          color="bg-green-500"
        />
        <KPICard
          title="Chờ duyệt"
          value={kpi?.orders_pending ?? 0}
          subtitle="đơn hàng mới"
          icon={ClockIcon}
          color="bg-yellow-500"
        />
        <KPICard
          title="Đang xử lý"
          value={(kpi?.orders_confirmed ?? 0) + (kpi?.orders_in_production ?? 0) + (kpi?.orders_ready ?? 0) + (kpi?.orders_shipping ?? 0)}
          subtitle="xác nhận + sản xuất + giao"
          icon={ShoppingBagIcon}
          color="bg-blue-500"
        />
        <KPICard
          title="Cảnh báo tồn kho"
          value={kpi?.low_stock_count ?? 0}
          subtitle="biến thể sắp hết hàng"
          icon={ExclamationTriangleIcon}
          color="bg-red-500"
        />
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="font-semibold text-neutral-800 mb-4">Phân bổ trạng thái đơn hàng</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { key: 'orders_pending', label: 'Chờ duyệt', color: 'text-yellow-600 bg-yellow-50' },
            { key: 'orders_confirmed', label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50' },
            { key: 'orders_in_production', label: 'Sản xuất', color: 'text-purple-600 bg-purple-50' },
            { key: 'orders_ready', label: 'Sẵn giao', color: 'text-indigo-600 bg-indigo-50' },
            { key: 'orders_shipping', label: 'Đang giao', color: 'text-orange-600 bg-orange-50' },
            { key: 'orders_completed_today', label: 'HT hôm nay', color: 'text-green-600 bg-green-50' },
          ].map(({ key, label, color }) => (
            <div key={key} className={`rounded-lg p-3 text-center ${color}`}>
              <p className="text-2xl font-bold">{kpi ? (kpi as any)[key] ?? 0 : '-'}</p>
              <p className="text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">Đơn hàng gần đây</h2>
            <Link href="/admin/orders" className="text-xs text-indigo-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Chưa có đơn hàng nào</p>
            )}
            {recentOrders.map(order => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-800 group-hover:text-indigo-600">
                    #{order.order_number}
                  </p>
                  <p className="text-xs text-neutral-400">{order.shipping_full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-medium text-neutral-700">
                    {formatVND(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">⚠ Tồn kho thấp</h2>
            <Link href="/admin/inventory" className="text-xs text-indigo-600 hover:underline">
              Xem kho →
            </Link>
          </div>
          <div className="space-y-2">
            {lowStock.length === 0 && (
              <p className="text-sm text-green-600 text-center py-4">✓ Không có sản phẩm sắp hết hàng</p>
            )}
            {lowStock.map(item => (
              <Link
                key={item.inventory_id}
                href={`/admin/products/${item.product_id}/edit`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-800 group-hover:text-indigo-600 truncate max-w-[200px]">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-neutral-400">{item.variant_name} · {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${item.available <= 0 ? 'text-red-600' : 'text-orange-500'}`}>
                    {item.available <= 0 ? 'Hết hàng' : `Còn ${item.available}`}
                  </p>
                  <p className="text-xs text-neutral-400">Ngưỡng: {item.low_stock_threshold}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="font-semibold text-neutral-800 mb-4">Top sản phẩm bán chạy (90 ngày)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left py-2 text-neutral-500 font-medium">Sản phẩm</th>
                  <th className="text-right py-2 text-neutral-500 font-medium">Số lượng</th>
                  <th className="text-right py-2 text-neutral-500 font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {(topProducts as any[]).map((p, i) => (
                  <tr key={p.product_id} className="border-b border-neutral-50">
                    <td className="py-2.5">
                      <Link href={`/admin/products/${p.product_id}/edit`} className="hover:text-indigo-600">
                        <span className="text-neutral-400 mr-2">#{i + 1}</span>
                        {p.product_name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-right text-neutral-700">{p.total_quantity_sold}</td>
                    <td className="py-2.5 text-right font-medium text-neutral-800">{formatVND(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
