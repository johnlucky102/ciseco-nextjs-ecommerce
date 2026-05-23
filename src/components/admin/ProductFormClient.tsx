'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createProduct, updateProduct, addProductImageUrl, deleteProductImage, setPrimaryImage } from '@/app/(admin)/admin/actions/catalog'
import VariantMatrix from './VariantMatrix'
import { TrashIcon, StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

interface Category { id: string; name: string }
interface Room { id: string; name: string }
interface Material { id: string; name: string; slug: string; material_type: string }
interface Image { id: string; image_url: string; is_primary: boolean; alt_text?: string | null }
interface Variant {
  id: string; name: string; sku: string | null; price: number; color: string | null
  is_default: boolean; is_active: boolean
  inventory?: { quantity: number; reserved_quantity: number }[] | null
  product_variant_materials?: { id: string; material_part: string | null; materials: { id: string; name: string } | null }[]
}

interface Props {
  mode: 'create' | 'edit'
  productId?: string
  initialData?: {
    name: string; slug: string; description: string | null; short_description: string | null
    base_price: number; compare_at_price: number | null; cost_price: number | null
    sku: string | null; status: string; is_featured: boolean; is_new: boolean
    category_id: string | null; room_id: string | null
    meta_title: string | null; meta_description: string | null
    product_images?: Image[]
    product_variants?: Variant[]
  }
  categories: Category[]
  rooms: Room[]
  materials: Material[]
}

const TABS = ['Thông tin', 'Hình ảnh', 'Biến thể'] as const
type Tab = typeof TABS[number]

function slugify(text: string) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
}

export default function ProductFormClient({ mode, productId, initialData, categories, rooms, materials }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>('Thông tin')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [addingImage, setAddingImage] = useState(false)

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? '',
    short_description: initialData?.short_description ?? '',
    base_price: initialData?.base_price?.toString() ?? '',
    compare_at_price: initialData?.compare_at_price?.toString() ?? '',
    cost_price: initialData?.cost_price?.toString() ?? '',
    sku: initialData?.sku ?? '',
    status: initialData?.status ?? 'draft',
    is_featured: initialData?.is_featured ?? false,
    is_new: initialData?.is_new ?? false,
    category_id: initialData?.category_id ?? '',
    room_id: initialData?.room_id ?? '',
    meta_title: initialData?.meta_title ?? '',
    meta_description: initialData?.meta_description ?? '',
  })

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, slug: mode === 'create' ? slugify(name) : f.slug }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createProduct(fd)
        if (res.error) { toast.error(res.error); return }
        toast.success('Đã tạo sản phẩm!')
        router.push(`/admin/products/${res.data?.id}/edit`)
      } else if (productId) {
        const res = await updateProduct(productId, fd)
        if (res.error) { toast.error(res.error); return }
        toast.success('Đã lưu thay đổi!')
      }
    })
  }

  async function handleAddImage() {
    if (!productId || !newImageUrl.trim()) return
    setAddingImage(true)
    const res = await addProductImageUrl(productId, newImageUrl.trim())
    if (res.error) toast.error(res.error)
    else { toast.success('Đã thêm ảnh'); setNewImageUrl('') }
    setAddingImage(false)
    router.refresh()
  }

  async function handleDeleteImage(imageId: string) {
    if (!productId || !confirm('Xóa ảnh này?')) return
    const res = await deleteProductImage(imageId, productId)
    if (res.error) toast.error(res.error)
    else router.refresh()
  }

  async function handleSetPrimary(imageId: string) {
    if (!productId) return
    await setPrimaryImage(imageId, productId)
    router.refresh()
  }

  const images = initialData?.product_images ?? []
  const variants = initialData?.product_variants ?? []

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={activeTab !== 'Thông tin' ? 'hidden' : ''}>
        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tên sản phẩm *</label>
              <input required value={form.name} onChange={e => handleNameChange(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Slug *</label>
              <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Giá cơ bản (VND) *</label>
              <input required type="number" min="0" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Giá gốc (giá gạch)</label>
              <input type="number" min="0" value={form.compare_at_price} onChange={e => setForm(f => ({ ...f, compare_at_price: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Giá vốn</label>
              <input type="number" min="0" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">SKU tổng quát</label>
              <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Danh mục</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="">— Chọn danh mục —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Không gian</label>
              <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="">— Chọn không gian —</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Trạng thái</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="draft">Nháp</option>
                <option value="active">Đang bán</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4 rounded" />
                Sản phẩm nổi bật
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_new} onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))} className="w-4 h-4 rounded" />
                Hàng mới về
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Mô tả ngắn</label>
              <input value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Mô tả đầy đủ</label>
              <textarea rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 resize-none" />
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button type="submit" disabled={isPending}
              className="bg-neutral-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50">
              {isPending ? 'Đang lưu...' : mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </form>

      {/* Images Tab */}
      {activeTab === 'Hình ảnh' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
          {mode === 'create' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Vui lòng tạo sản phẩm trước, sau đó quay lại tab này để thêm ảnh.
            </div>
          )}
          {mode === 'edit' && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Thêm ảnh bằng URL</label>
                <div className="flex gap-2">
                  <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
                  <button type="button" onClick={handleAddImage} disabled={addingImage || !newImageUrl.trim()}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-neutral-700 disabled:opacity-50">
                    Thêm
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-neutral-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="" className="w-full h-32 object-cover" />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded font-medium">Chính</span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.is_primary && (
                        <button type="button" onClick={() => handleSetPrimary(img.id)}
                          className="p-1.5 bg-yellow-400 rounded-lg" title="Đặt làm ảnh chính">
                          <StarIcon className="w-4 h-4 text-yellow-900" />
                        </button>
                      )}
                      <button type="button" onClick={() => handleDeleteImage(img.id)}
                        className="p-1.5 bg-red-500 rounded-lg" title="Xóa ảnh">
                        <TrashIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
                {images.length === 0 && (
                  <p className="col-span-4 text-sm text-neutral-400 py-6 text-center">Chưa có ảnh nào</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Variants Tab */}
      {activeTab === 'Biến thể' && (
        <div className="space-y-4">
          {mode === 'create' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Vui lòng tạo sản phẩm trước, sau đó quay lại tab này để thêm biến thể.
            </div>
          )}
          {mode === 'edit' && productId && (
            <VariantMatrix productId={productId} existingVariants={variants} materials={materials} />
          )}
        </div>
      )}
    </div>
  )
}
