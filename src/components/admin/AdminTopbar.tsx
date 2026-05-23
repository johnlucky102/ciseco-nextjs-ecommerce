'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
  userRole: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  catalog_manager: 'Quản lý Catalog',
  order_manager: 'Quản lý Đơn hàng',
  support: 'Hỗ trợ',
}

export default function AdminTopbar({ user, userRole }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
      <div className="text-sm text-neutral-500">
        Chào mừng trở lại,{' '}
        <span className="font-medium text-neutral-800">
          {user.email}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          {ROLE_LABELS[userRole] ?? userRole}
        </span>

        <div className="flex items-center gap-1 text-neutral-400">
          <UserCircleIcon className="w-5 h-5" />
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </header>
  )
}
