'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  CubeIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  UsersIcon,
  StarIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: HomeIcon, exact: true },
  { href: '/admin/products', label: 'Sản phẩm', icon: CubeIcon },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBagIcon },
  { href: '/admin/inventory', label: 'Kho hàng', icon: ArchiveBoxIcon },
  { href: '/admin/settings/roles', label: 'Phân quyền', icon: UsersIcon },
]

export default function AdminNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-neutral-700">
        <span className="text-white font-bold text-lg tracking-tight">
          Admin Panel
        </span>
        <p className="text-neutral-400 text-xs mt-0.5">Quản lý hệ thống</p>
      </div>

      {/* Nav links */}
      <ul className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <li key={href}>
              <Link
                href={href as any}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Back to store */}
      <div className="p-4 border-t border-neutral-700">
        <Link
          href={'/' as any}
          className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Về trang cửa hàng
        </Link>
      </div>
    </nav>
  )
}
