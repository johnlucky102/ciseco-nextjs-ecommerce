import { getUsersWithRoles } from '@/lib/supabase/admin'
import RolesManager from '@/components/admin/RolesManager'

export default async function AdminRolesPage() {
  const usersWithRoles = await getUsersWithRoles()

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Phân quyền</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Cấp và thu hồi quyền admin cho người dùng trong hệ thống.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">⚠ Lưu ý bảo mật</p>
        <ul className="list-disc list-inside space-y-1 text-amber-700">
          <li>Chỉ cấp role <strong>Admin</strong> cho người thực sự tin cậy.</li>
          <li>Role <strong>Admin</strong> có toàn quyền bao gồm thu hồi role của admin khác.</li>
          <li>Bootstrap admin đầu tiên phải chạy qua Supabase Studio (xem README).</li>
          <li>Mọi thay đổi phân quyền đều được ghi vào <code>admin_audit_logs</code>.</li>
        </ul>
      </div>

      <RolesManager usersWithRoles={usersWithRoles} />
    </div>
  )
}
