'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { assignRole, revokeRole } from '@/app/(admin)/admin/actions/roles'
import { UserPlusIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

interface UserWithRole {
  user_id: string
  role: string
  created_at: string
  email?: string
  full_name?: string
}

interface Props {
  usersWithRoles: UserWithRole[]
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', desc: 'Toàn quyền quản lý' },
  { value: 'catalog_manager', label: 'Quản lý Catalog', desc: 'Quản lý sản phẩm, kho hàng' },
  { value: 'order_manager', label: 'Quản lý Đơn hàng', desc: 'Xử lý đơn, logistics' },
  { value: 'support', label: 'Hỗ trợ', desc: 'Xem đơn hàng, khách hàng' },
]

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  catalog_manager: 'bg-blue-100 text-blue-800',
  order_manager: 'bg-purple-100 text-purple-800',
  support: 'bg-green-100 text-green-800',
}

export default function RolesManager({ usersWithRoles }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; full_name: string | null }[]>([])
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null)
  const [selectedRole, setSelectedRole] = useState('catalog_manager')
  const [searching, setSearching] = useState(false)

  async function handleSearch() {
    if (!searchEmail.trim()) return
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', `%${searchEmail}%`)
      .limit(5)
    setSearchResults((data ?? []).map((u: any) => ({ ...u, email: u.email ?? '' })))
    setSearching(false)
  }

  function handleAssign() {
    if (!selectedUser) { toast.error('Chọn người dùng trước'); return }
    startTransition(async () => {
      const res = await assignRole(selectedUser.id, selectedRole)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Đã cấp role "${selectedRole}" cho ${selectedUser.email}`)
      setSelectedUser(null); setSearchEmail(''); setSearchResults([])
      router.refresh()
    })
  }

  function handleRevoke(userId: string, role: string, email: string) {
    if (!confirm(`Thu hồi role "${role}" của ${email}?`)) return
    startTransition(async () => {
      const res = await revokeRole(userId, role)
      if (res.error) { toast.error(res.error); return }
      toast.success('Đã thu hồi role')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Assign new role */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <UserPlusIcon className="w-5 h-5 text-indigo-500" />
          Cấp quyền cho người dùng
        </h2>
        <div className="space-y-4">
          {/* Search user */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tìm người dùng theo email</label>
            <div className="flex gap-2">
              <input value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                placeholder="email@example.com"
                className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
              <button type="button" onClick={handleSearch} disabled={searching}
                className="bg-neutral-100 border border-neutral-200 text-neutral-700 px-3 py-2 rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
              {searchResults.map(u => (
                <button key={u.id} type="button"
                  onClick={() => { setSelectedUser({ id: u.id, email: u.email }); setSearchResults([]) }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors text-sm ${selectedUser?.id === u.id ? 'bg-indigo-50' : ''}`}
                >
                  <div>
                    <p className="font-medium text-neutral-800">{u.email}</p>
                    {u.full_name && <p className="text-xs text-neutral-400">{u.full_name}</p>}
                  </div>
                  {selectedUser?.id === u.id && <span className="text-xs text-indigo-600 font-medium">Đã chọn</span>}
                </button>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
              <span className="text-indigo-800 font-medium">{selectedUser.email}</span>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-indigo-400 hover:text-indigo-700">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Chọn role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(r => (
                <button key={r.value} type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedRole === r.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:border-neutral-400 text-neutral-700'
                  }`}>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className={`text-xs mt-0.5 ${selectedRole === r.value ? 'text-neutral-300' : 'text-neutral-400'}`}>{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleAssign}
            disabled={!selectedUser || isPending}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Đang cấp...' : 'Cấp quyền'}
          </button>
        </div>
      </div>

      {/* Current roles table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-800">Danh sách Admin ({usersWithRoles.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Người dùng</th>
              <th className="text-center px-4 py-3 text-neutral-500 font-medium">Role</th>
              <th className="text-right px-4 py-3 text-neutral-500 font-medium hidden md:table-cell">Cấp lúc</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {usersWithRoles.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-neutral-400">Chưa có admin nào (Bootstrap trước)</td></tr>
            )}
            {usersWithRoles.map(u => (
              <tr key={`${u.user_id}-${u.role}`} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-800">{u.email ?? '—'}</p>
                  {u.full_name && <p className="text-xs text-neutral-400">{u.full_name}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-800'}`}>
                    {ROLE_OPTIONS.find(r => r.value === u.role)?.label ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-neutral-400 text-xs hidden md:table-cell">
                  {new Date(u.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleRevoke(u.user_id, u.role, u.email ?? '')}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50">
                    Thu hồi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
