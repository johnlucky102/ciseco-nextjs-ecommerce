import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { getCategories, getRooms, getMaterials } from '@/app/(admin)/admin/actions/catalog'
import ProductFormClient from '@/components/admin/ProductFormClient'

export default async function NewProductPage() {
  const [categories, rooms, materials] = await Promise.all([
    getCategories(),
    getRooms(),
    getMaterials(),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin/products" className="hover:text-neutral-800">Sản phẩm</Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-neutral-800 font-medium">Thêm mới</span>
      </div>

      <h1 className="text-2xl font-bold text-neutral-900">Thêm sản phẩm mới</h1>

      <ProductFormClient
        mode="create"
        categories={categories}
        rooms={rooms}
        materials={materials}
      />
    </div>
  )
}
