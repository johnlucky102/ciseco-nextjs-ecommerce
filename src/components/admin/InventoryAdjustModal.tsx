'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { adjustInventory } from '@/app/(admin)/admin/actions/inventory'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  variantId: string
  variantName: string
  currentQuantity: number
  onClose: () => void
}

const REASONS = [
  'Nhập kho',
  'Kiểm kê lệch',
  'Hư hỏng',
  'Hoàn hàng từ đơn',
  'Điều chỉnh thủ công',
]

export default function InventoryAdjustModal({ variantId, variantName, currentQuantity, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'add' | 'subtract' | 'set'>('add')
  const [amount, setAmount] = useState(1)
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')

  const previewQuantity = (() => {
    if (mode === 'add') return currentQuantity + amount
    if (mode === 'subtract') return currentQuantity - amount
    return amount
  })()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const delta = mode === 'add' ? amount : mode === 'subtract' ? -amount : amount - currentQuantity

    if (delta === 0) { toast('Không có thay đổi tồn kho.'); return }
    if (previewQuantity < 0) { toast.error('Tồn kho không thể âm.'); return }

    startTransition(async () => {
      const res = await adjustInventory(variantId, delta, reason, note || undefined)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Đã cập nhật tồn kho: ${currentQuantity} → ${previewQuantity}`)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="font-bold text-neutral-900">Điều chỉnh tồn kho</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">{variantName}</p>
            <p className="text-xs text-neutral-400 mt-0.5">Tồn kho hiện tại: <strong>{currentQuantity}</strong></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Loại điều chỉnh</label>
            <div className="flex gap-2">
              {(['add', 'subtract', 'set'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === m ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}>
                  {m === 'add' ? '+ Nhập' : m === 'subtract' ? '− Xuất' : '= Đặt số'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {mode === 'set' ? 'Số lượng mới' : 'Số lượng'}
            </label>
            <input type="number" min={mode === 'set' ? 0 : 1} value={amount}
              onChange={e => setAmount(Number(e.target.value))} required
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            <p className={`text-xs mt-1 font-medium ${previewQuantity < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
              Sau điều chỉnh: {previewQuantity < 0 ? 'Không hợp lệ (âm)' : previewQuantity}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Lý do *</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Ghi chú thêm</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Tùy chọn..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-neutral-200 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={isPending || previewQuantity < 0}
              className="flex-1 bg-neutral-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors">
              {isPending ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
