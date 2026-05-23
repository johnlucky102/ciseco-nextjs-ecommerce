'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdjustmentsHorizontalIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
// InventoryTable has no server-only imports – safe as client component
import InventoryAdjustModal from './InventoryAdjustModal'

interface InventoryRow {
  id: string
  variant_id: string
  quantity: number
  reserved_quantity: number
  low_stock_threshold: number
  last_updated_at: string
  product_variants: {
    id: string
    name: string
    sku: string | null
    price: number
    color: string | null
    is_active: boolean
    products: { id: string; name: string; slug: string } | null
  } | null
}

interface Props {
  inventory: InventoryRow[]
  count: number
  currentPage: number
  currentSearch: string
  currentFilter: string
}

export default function InventoryTable({ inventory, count, currentPage, currentSearch, currentFilter }: Props) {
  const router = useRouter()
  const [adjustTarget, setAdjustTarget] = useState<{ variantId: string; variantName: string; quantity: number } | null>(null)

  const totalPages = Math.ceil(count / 30)

  function buildQuery(overrides: Record<string, string>) {
    const q = new URLSearchParams()
    if (currentSearch) q.set('search', currentSearch)
    if (currentFilter) q.set('filter', currentFilter)
    q.set('page', String(currentPage))
    Object.entries(overrides).forEach(([k, v]) => { if (v) q.set(k, v); else q.delete(k) })
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <form className="flex gap-2 flex-1 min-w-0">
            <input name="search" defaultValue={currentSearch}
              placeholder="Tìm theo tên, SKU..."
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-0 outline-none focus:ring-2 focus:ring-neutral-900"
            />
            {currentFilter && <input type="hidden" name="filter" value={currentFilter} />}
            <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors">
              Tìm
            </button>
          </form>
          <div className="flex gap-2">
            {[
              { value: '', label: 'Tất cả' },
              { value: 'low_stock', label: '⚠ Sắp hết' },
              { value: 'out_of_stock', label: '✗ Hết hàng' },
            ].map(f => (
              <Link key={f.value}
                href={`/admin/inventory${buildQuery({ filter: f.value, page: '1' })}` as any}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentFilter === f.value
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">Sản phẩm / Biến thể</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium">Tồn kho</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium hidden md:table-cell">Giữ chỗ</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium">Khả dụng</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium hidden lg:table-cell">Cập nhật</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-neutral-400">Không có dữ liệu tồn kho</td></tr>
              )}
              {inventory.map(row => {
                const variant = row.product_variants
                const product = variant?.products
                const available = row.quantity - row.reserved_quantity
                const isLow = available <= row.low_stock_threshold && available > 0
                const isOut = row.quantity === 0

                return (
                  <tr key={row.id} className={`border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${isOut ? 'bg-red-50/30' : isLow ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(isOut || isLow) && (
                          <ExclamationTriangleIcon className={`w-4 h-4 flex-shrink-0 ${isOut ? 'text-red-500' : 'text-orange-400'}`} />
                        )}
                        <div>
                          <Link href={`/admin/products/${product?.id}/edit` as any}
                            className="font-medium text-neutral-800 hover:text-indigo-600 line-clamp-1">
                            {product?.name ?? '—'}
                          </Link>
                          <p className="text-xs text-neutral-400">
                            {variant?.name}
                            {variant?.sku ? ` · ${variant.sku}` : ''}
                            {variant?.color ? ` · ${variant.color}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-800">{row.quantity}</td>
                    <td className="px-4 py-3 text-right text-neutral-500 hidden md:table-cell">{row.reserved_quantity}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-green-600'}`}>
                      {isOut ? 'Hết' : available}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-400 text-xs hidden lg:table-cell">
                      {new Date(row.last_updated_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button"
                        onClick={() => setAdjustTarget({ variantId: row.variant_id, variantName: `${product?.name} – ${variant?.name}`, quantity: row.quantity })}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                        Điều chỉnh
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link href={`/admin/inventory${buildQuery({ page: String(currentPage - 1) })}` as any}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">
                ← Trước
              </Link>
            )}
            <span className="text-sm text-neutral-500">Trang {currentPage} / {totalPages}</span>
            {currentPage < totalPages && (
              <Link href={`/admin/inventory${buildQuery({ page: String(currentPage + 1) })}` as any}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">
                Sau →
              </Link>
            )}
          </div>
        )}
      </div>

      {adjustTarget && (
        <InventoryAdjustModal
          variantId={adjustTarget.variantId}
          variantName={adjustTarget.variantName}
          currentQuantity={adjustTarget.quantity}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </>
  )
}
