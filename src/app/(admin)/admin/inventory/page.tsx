import { getAdminInventory } from '@/lib/supabase/admin'
import InventoryTable from '@/components/admin/InventoryTable'

interface PageProps {
  searchParams: Promise<{ search?: string; filter?: string; page?: string }>
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const { data: inventory, count } = await getAdminInventory({
    search: params.search,
    low_stock: params.filter === 'low_stock',
    out_of_stock: params.filter === 'out_of_stock',
    page,
    pageSize: 30,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Kho hàng</h1>
        <p className="text-sm text-neutral-500 mt-0.5">{count} biến thể</p>
      </div>

      <InventoryTable
        inventory={inventory as any[]}
        count={count ?? 0}
        currentPage={page}
        currentSearch={params.search ?? ''}
        currentFilter={params.filter ?? ''}
      />
    </div>
  )
}
