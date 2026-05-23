import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { getAdminProductDetail } from '@/lib/supabase/admin'
import { getCategories, getRooms, getMaterials } from '@/app/(admin)/admin/actions/catalog'
import ProductFormClient from '@/components/admin/ProductFormClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params
  const [product, categories, rooms, materials] = await Promise.all([
    getAdminProductDetail(id),
    getCategories(),
    getRooms(),
    getMaterials(),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin/products" className="hover:text-neutral-800">Sản phẩm</Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-neutral-800 font-medium line-clamp-1">{product.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Sửa sản phẩm</h1>
        <Link
          href={`/product-detail/${product.slug}`}
          target="_blank"
          className="text-sm text-indigo-600 hover:underline"
        >
          Xem trên store →
        </Link>
      </div>

      <ProductFormClient
        mode="edit"
        productId={product.id}
        initialData={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          short_description: product.short_description,
          base_price: product.base_price,
          compare_at_price: product.compare_at_price,
          cost_price: product.cost_price,
          sku: product.sku,
          status: product.status ?? 'draft',
          is_featured: product.is_featured ?? false,
          is_new: product.is_new ?? false,
          category_id: product.category_id,
          room_id: product.room_id,
          meta_title: product.meta_title,
          meta_description: product.meta_description,
          product_images: (product.product_images ?? []).map((img: any) => ({
            ...img,
            is_primary: img.is_primary ?? false,
          })),
          product_variants: (product.product_variants ?? []).map((v: any) => ({
            ...v,
            is_default: v.is_default ?? false,
            is_active: v.is_active ?? true,
          })),
        }}
        categories={categories}
        rooms={rooms}
        materials={materials}
      />
    </div>
  )
}
