import Link from 'next/link'
import { getAdminProducts, formatVND } from '@/lib/supabase/admin'
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-neutral-100 text-neutral-600',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Đang bán', draft: 'Nháp', archived: 'Lưu trữ',
}

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const { data: products, count } = await getAdminProducts({
    search: params.search,
    status: params.status,
    page,
    pageSize: 20,
  })
  const totalPages = Math.ceil((count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Sản phẩm</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{count} sản phẩm</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Thêm sản phẩm
        </Link>
      </div>

      <form className="flex items-center gap-3 flex-wrap">
        <input
          name="search" defaultValue={params.search}
          placeholder="Tìm theo tên sản phẩm..."
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <select
          name="status" defaultValue={params.status ?? ''}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="draft">Nháp</option>
          <option value="archived">Lưu trữ</option>
        </select>
        <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors">
          Lọc
        </button>
        {(params.search || params.status) && (
          <Link href={'/admin/products' as any} className="text-sm text-neutral-500 hover:text-neutral-800">Xóa lọc</Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Sản phẩm</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium hidden md:table-cell">Danh mục</th>
              <th className="text-right px-4 py-3 text-neutral-500 font-medium">Giá</th>
              <th className="text-center px-4 py-3 text-neutral-500 font-medium">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-neutral-400">Không có sản phẩm nào</td></tr>
            )}
            {products.map(product => {
              const img = product.product_images?.find(i => i.is_primary) ?? product.product_images?.[0]
              return (
                <tr key={product.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img
                        ? <img src={img.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-neutral-100" />
                        : <div className="w-10 h-10 rounded-lg bg-neutral-100 flex-shrink-0" />
                      }
                      <div>
                        <p className="font-medium text-neutral-800 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-neutral-400">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 hidden md:table-cell">
                    {(product.categories as any)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-neutral-800">
                    {formatVND(product.base_price)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[product.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[product.status] ?? product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />Sửa
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.status ? `&status=${params.status}` : ''}` as any}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">
              ← Trước
            </Link>
          )}
          <span className="text-sm text-neutral-500">Trang {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.status ? `&status=${params.status}` : ''}` as any}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">
              Sau →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
