'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { updateOrderStatus, upsertOrderFulfillment, updatePaymentStatus } from '@/app/(admin)/admin/actions/orders'
import { VALID_NEXT_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/admin-constants'
import { CheckCircleIcon, XCircleIcon, TruckIcon } from '@heroicons/react/24/outline'

interface Team { id: string; name: string; leader_name: string | null; phone: string | null }
interface Vehicle { id: string; license_plate: string; vehicle_type: string | null }
interface Fulfillment {
  id?: string
  scheduled_at?: string | null
  delivery_notes?: string | null
  team?: { name: string } | null
  vehicle?: { license_plate: string; vehicle_type: string | null } | null
}

interface Props {
  orderId: string
  currentStatus: string
  currentPaymentStatus: string
  fulfillment: Fulfillment | null
  teams: Team[]
  vehicles: Vehicle[]
}

export default function OrderStatusActions({
  orderId, currentStatus, currentPaymentStatus, fulfillment, teams, vehicles,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [showLogistics, setShowLogistics] = useState(false)

  const [logisticsForm, setLogisticsForm] = useState({
    team_id: (fulfillment as any)?.team_id ?? '',
    vehicle_id: (fulfillment as any)?.vehicle_id ?? '',
    scheduled_at: fulfillment?.scheduled_at ? fulfillment.scheduled_at.slice(0, 16) : '',
    delivery_notes: fulfillment?.delivery_notes ?? '',
  })

  const nextStatuses = VALID_NEXT_STATUSES[currentStatus] ?? []

  function handleStatusChange(nextStatus: string) {
    if (!confirm(`Chuyển trạng thái sang "${ORDER_STATUS_LABELS[nextStatus] ?? nextStatus}"?`)) return
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, nextStatus, note || undefined)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Đã chuyển sang: ${ORDER_STATUS_LABELS[nextStatus] ?? nextStatus}`)
      setNote('')
      router.refresh()
    })
  }

  async function handleLogisticsSave() {
    const res = await upsertOrderFulfillment(orderId, {
      team_id: logisticsForm.team_id || null,
      vehicle_id: logisticsForm.vehicle_id || null,
      scheduled_at: logisticsForm.scheduled_at ? new Date(logisticsForm.scheduled_at).toISOString() : null,
      delivery_notes: logisticsForm.delivery_notes || null,
    })
    if (res.error) { toast.error(res.error); return }
    toast.success('Đã lưu thông tin logistics')
    setShowLogistics(false)
    router.refresh()
  }

  async function handlePaymentStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value
    if (!confirm(`Cập nhật thanh toán thành "${PAYMENT_STATUS_LABELS[newStatus] ?? newStatus}"?`)) return
    const res = await updatePaymentStatus(orderId, newStatus)
    if (res.error) toast.error(res.error)
    else { toast.success('Đã cập nhật trạng thái thanh toán'); router.refresh() }
  }

  return (
    <div className="space-y-4">
      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="font-semibold text-neutral-800 mb-3">Chuyển trạng thái</h3>
          <div className="mb-3">
            <label className="block text-sm text-neutral-600 mb-1">Ghi chú (tùy chọn)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="Lý do, ghi chú thêm..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(s => {
              const isCancelOrNeg = s === 'cancelled'
              return (
                <button key={s} type="button" onClick={() => handleStatusChange(s)} disabled={isPending}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    isCancelOrNeg
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  {isCancelOrNeg ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                  {ORDER_STATUS_LABELS[s] ?? s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment status */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-neutral-800 mb-3">Trạng thái thanh toán</h3>
        <select value={currentPaymentStatus} onChange={handlePaymentStatusChange}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="unpaid">Chưa thanh toán</option>
          <option value="paid">Đã thanh toán</option>
          <option value="partial_refund">Hoàn một phần</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select>
      </div>

      {/* Logistics assignment */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-neutral-800">Logistics & Lắp đặt</h3>
          <button type="button" onClick={() => setShowLogistics(!showLogistics)}
            className="text-sm text-indigo-600 hover:underline">
            {showLogistics ? 'Thu gọn' : 'Chỉnh sửa'}
          </button>
        </div>

        {/* Current logistics info */}
        {!showLogistics && fulfillment && (
          <div className="text-sm space-y-1 text-neutral-600">
            {fulfillment.team && <p><span className="font-medium">Đội:</span> {fulfillment.team.name}</p>}
            {fulfillment.vehicle && <p><span className="font-medium">Xe:</span> {fulfillment.vehicle.license_plate} ({fulfillment.vehicle.vehicle_type})</p>}
            {fulfillment.scheduled_at && <p><span className="font-medium">Lịch giao:</span> {new Date(fulfillment.scheduled_at).toLocaleString('vi-VN')}</p>}
            {fulfillment.delivery_notes && <p><span className="font-medium">Ghi chú:</span> {fulfillment.delivery_notes}</p>}
          </div>
        )}
        {!showLogistics && !fulfillment && (
          <p className="text-sm text-neutral-400 flex items-center gap-2">
            <TruckIcon className="w-4 h-4" />
            Chưa gán thông tin giao hàng
          </p>
        )}

        {showLogistics && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Đội lắp đặt</label>
                <select value={logisticsForm.team_id} onChange={e => setLogisticsForm(f => ({ ...f, team_id: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                  <option value="">— Chưa gán —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} {t.phone ? `(${t.phone})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Xe vận chuyển</label>
                <select value={logisticsForm.vehicle_id} onChange={e => setLogisticsForm(f => ({ ...f, vehicle_id: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900">
                  <option value="">— Chưa gán —</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} ({v.vehicle_type ?? 'xe'})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Lịch giao & lắp</label>
              <input type="datetime-local" value={logisticsForm.scheduled_at}
                onChange={e => setLogisticsForm(f => ({ ...f, scheduled_at: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Ghi chú giao hàng</label>
              <textarea rows={2} value={logisticsForm.delivery_notes}
                onChange={e => setLogisticsForm(f => ({ ...f, delivery_notes: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 resize-none" />
            </div>
            <button type="button" onClick={handleLogisticsSave}
              className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors">
              Lưu logistics
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
