import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import AdminTopbar from '@/components/admin/AdminTopbar'

export const metadata = {
  title: 'Admin Panel',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/admin')
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)

  if (!roleData || roleData.length === 0) {
    redirect('/?error=unauthorized')
  }

  const userRole = roleData[0].role

  return (
    <div className="fixed inset-0 z-[9999] flex bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-neutral-900 flex flex-col overflow-hidden">
        <AdminNav />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar user={user} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
