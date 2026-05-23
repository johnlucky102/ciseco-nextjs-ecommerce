'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { upsertVariants, deleteVariant, type VariantInput } from '@/app/(admin)/admin/actions/catalog'
import { TrashIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface Material { id: string; name: string; slug: string; material_type: string }
interface Variant {
  id: string; name: string; sku: string | null; price: number; color: string | null
  is_default: boolean; is_active: boolean
  inventory?: { quantity: number; reserved_quantity: number }[] | null
}

interface Props {
  productId: string
  existingVariants: Variant[]
  materials: Material[]
}

interface VariantRow {
  key: string
  id?: string
  name: string
  sku: string
  price: number
  color: string
  is_default: boolean
  is_active: boolean
  initial_stock: number
  material_ids: string[]
  isNew: boolean
}

export default function VariantMatrix({ productId, existingVariants, materials }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [variants, setVariants] = useState<VariantRow[]>(() =>
    existingVariants.map(v => ({
      key: v.id,
      id: v.id,
      name: v.name,
      sku: v.sku ?? '',
      price: v.price,
      color: v.color ?? '',
      is_default: v.is_default,
      is_active: v.is_active,
      initial_stock: v.inventory?.[0]?.quantity ?? 0,
      material_ids: [],
      isNew: false,
    }))
  )

  // Matrix generator state
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [colorsInput, setColorsInput] = useState('')
  const [basePriceDelta, setBasePriceDelta] = useState(0)

  function generateMatrix() {
    const colors = colorsInput.split(',').map(s => s.trim()).filter(Boolean)
    const matList = materials.filter(m => selectedMaterials.includes(m.id))

    if (matList.length === 0 && colors.length === 0) {
      toast.error('Chọn ít nhất 1 chất liệu hoặc nhập màu sắc.')
      return
    }

    const newRows: VariantRow[] = []

    if (matList.length > 0 && colors.length > 0) {
      // Material × Color matrix
      matList.forEach(mat => {
        colors.forEach(color => {
          const name = `${mat.name} - ${color}`
          const key = `new-${name}`
          if (!variants.find(v => v.name === name)) {
            newRows.push({
              key, name,
              sku: `${mat.slug}-${color.toLowerCase().replace(/\s+/g, '-')}`,
              price: basePriceDelta, color, is_default: false, is_active: true,
              initial_stock: 0, material_ids: [mat.id], isNew: true,
            })
          }
        })
      })
    } else if (matList.length > 0) {
      matList.forEach(mat => {
        const name = mat.name
        if (!variants.find(v => v.name === name)) {
          newRows.push({
            key: `new-${mat.id}`, name,
            sku: mat.slug,
            price: basePriceDelta, color: '', is_default: false, is_active: true,
            initial_stock: 0, material_ids: [mat.id], isNew: true,
          })
        }
      })
    } else {
      colors.forEach(color => {
        if (!variants.find(v => v.color === color)) {
          newRows.push({
            key: `new-${color}`, name: color,
            sku: color.toLowerCase().replace(/\s+/g, '-'),
            price: basePriceDelta, color, is_default: false, is_active: true,
            initial_stock: 0, material_ids: [], isNew: true,
          })
        }
      })
    }

    if (newRows.length === 0) {
      toast('Không có biến thể mới nào được tạo (đã tồn tại hết).')
      return
    }

    setVariants(prev => [...prev, ...newRows])
    toast.success(`Đã thêm ${newRows.length} biến thể vào danh sách`)
  }

  function updateRow(key: string, field: keyof VariantRow, value: any) {
    setVariants(rows => rows.map(r => r.key === key ? { ...r, [field]: value } : r))
  }

  function removeRow(key: string) {
    setVariants(rows => rows.filter(r => r.key !== key))
  }

  async function handleDeleteExisting(variantId: string) {
    if (!confirm('Xóa biến thể này? Dữ liệu tồn kho sẽ bị xóa theo.')) return
    const res = await deleteVariant(variantId, productId)
    if (res.error) { toast.error(res.error); return }
    toast.success('Đã xóa biến thể')
    setVariants(rows => rows.filter(r => r.id !== variantId))
    router.refresh()
  }

  function handleSave() {
    startTransition(async () => {
      const payload: VariantInput[] = variants.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        product_id: productId,
        name: v.name,
        sku: v.sku || undefined,
        price: v.price,
        color: v.color || undefined,
        is_default: v.is_default,
        is_active: v.is_active,
        initial_stock: v.isNew ? v.initial_stock : undefined,
        material_ids: v.material_ids.length > 0 ? v.material_ids : undefined,
      }))
      const res = await upsertVariants(payload)
      if (res.error) { toast.error(res.error); return }
      toast.success('Đã lưu biến thể!')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Matrix Generator */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-neutral-800">Tạo biến thể tự động (Matrix)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Chọn chất liệu</label>
            <div className="border border-neutral-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
              {materials.map(m => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-50 px-1 py-0.5 rounded">
                  <input type="checkbox" checked={selectedMaterials.includes(m.id)}
                    onChange={e => setSelectedMaterials(prev =>
                      e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id)
                    )}
                    className="w-3.5 h-3.5 rounded"
                  />
                  {m.name}
                  <span className="text-xs text-neutral-400 ml-auto">{m.material_type}</span>
                </label>
              ))}
              {materials.length === 0 && <p className="text-xs text-neutral-400 p-1">Chưa có chất liệu nào</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Màu sắc / hoàn thiện (cách nhau bởi dấu phẩy)</label>
            <textarea rows={4} value={colorsInput} onChange={e => setColorsInput(e.target.value)}
              placeholder="Trắng, Đen, Nâu walnut, Xám tro..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Chênh lệch giá (VND)</label>
            <input type="number" value={basePriceDelta} onChange={e => setBasePriceDelta(Number(e.target.value))}
              placeholder="0"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            <p className="text-xs text-neutral-400 mt-1">Giá variant = giá SP + delta</p>
          </div>
        </div>
        <button type="button" onClick={generateMatrix}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <SparklesIcon className="w-4 h-4" />
          Tạo matrix biến thể
        </button>
      </div>

      {/* Variants Table */}
      {variants.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-800">{variants.length} biến thể</h3>
            <button type="button" onClick={handleSave} disabled={isPending}
              className="bg-neutral-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors">
              {isPending ? 'Đang lưu...' : 'Lưu tất cả'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="text-left px-3 py-2 text-neutral-500 font-medium">Tên biến thể</th>
                  <th className="text-left px-3 py-2 text-neutral-500 font-medium">SKU</th>
                  <th className="text-right px-3 py-2 text-neutral-500 font-medium">Giá (VND)</th>
                  <th className="text-left px-3 py-2 text-neutral-500 font-medium">Màu</th>
                  <th className="text-right px-3 py-2 text-neutral-500 font-medium">Tồn kho</th>
                  <th className="text-center px-3 py-2 text-neutral-500 font-medium">Mặc định</th>
                  <th className="text-center px-3 py-2 text-neutral-500 font-medium">Hiển thị</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.key} className={`border-b border-neutral-50 ${v.isNew ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-3 py-2">
                      <input value={v.name} onChange={e => updateRow(v.key, 'name', e.target.value)}
                        className="w-full border border-neutral-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.sku} onChange={e => updateRow(v.key, 'sku', e.target.value)}
                        className="w-full border border-neutral-200 rounded px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={v.price} onChange={e => updateRow(v.key, 'price', Number(e.target.value))}
                        className="w-24 border border-neutral-200 rounded px-2 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={v.color} onChange={e => updateRow(v.key, 'color', e.target.value)}
                        className="w-full border border-neutral-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2">
                      {v.isNew
                        ? <input type="number" min="0" value={v.initial_stock}
                            onChange={e => updateRow(v.key, 'initial_stock', Number(e.target.value))}
                            className="w-16 border border-neutral-200 rounded px-2 py-1 text-xs text-right outline-none focus:ring-1 focus:ring-neutral-900" />
                        : <span className="text-neutral-600">{existingVariants.find(ev => ev.id === v.id)?.inventory?.[0]?.quantity ?? 0}</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={v.is_default} onChange={e => updateRow(v.key, 'is_default', e.target.checked)} className="w-3.5 h-3.5 rounded" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={v.is_active} onChange={e => updateRow(v.key, 'is_active', e.target.checked)} className="w-3.5 h-3.5 rounded" />
                    </td>
                    <td className="px-3 py-2">
                      {v.id
                        ? <button type="button" onClick={() => handleDeleteExisting(v.id!)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        : <button type="button" onClick={() => removeRow(v.key)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {variants.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-neutral-400">
          <p className="text-sm">Chưa có biến thể nào. Dùng Matrix Generator phía trên để tạo tự động.</p>
        </div>
      )}
    </div>
  )
}
