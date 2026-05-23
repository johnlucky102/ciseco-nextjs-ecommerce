# Admin Bootstrap & Operations Guide

## 1. Áp dụng Migrations

Sau khi pull code, chạy:

```bash
# Reset DB và áp dụng tất cả migrations (local dev)
supabase db reset

# Hoặc chỉ áp dụng migrations mới
supabase migration up
```

Thứ tự migrations admin:
1. `20260523000000_admin_rbac.sql` – Bảng `user_roles`, `admin_audit_logs`, functions `has_role`, `is_admin`
2. `20260523000001_admin_rls_policies.sql` – RLS admin cho catalog + commerce
3. `20260523000002_admin_dashboard_views.sql` – Views KPI + function `admin_get_dashboard_kpi`
4. `20260523000003_admin_logistics_inventory.sql` – Logistics tables + RPC `admin_update_order_status`, `admin_adjust_inventory`
5. `20260523000004_admin_storage.sql` – Storage bucket `product-images` với policies

---

## 2. Bootstrap Admin đầu tiên

### Bước 1: Đăng ký tài khoản qua UI
Truy cập `http://localhost:3000/signup` và tạo tài khoản bình thường.

### Bước 2: Lấy User ID
Vào **Supabase Studio** → **Authentication** → **Users** → copy UUID của tài khoản vừa tạo.

### Bước 3: Cấp quyền Admin qua SQL
Vào **Supabase Studio** → **SQL Editor** và chạy:

```sql
-- Cách 1: Dùng helper function (chỉ hoạt động khi chưa có admin nào)
SELECT admin_bootstrap_first_admin('<paste-your-user-uuid-here>');

-- Cách 2: Insert trực tiếp (dùng khi đã có admin, cần chạy từ service role)
INSERT INTO public.user_roles (user_id, role)
VALUES ('<paste-your-user-uuid-here>', 'admin');
```

### Bước 4: Kiểm tra
Đăng nhập với tài khoản đó và truy cập `http://localhost:3000/admin`.

---

## 3. Test RLS (Kiểm tra bảo mật)

### Test 1: Anonymous bị redirect
```bash
curl -I http://localhost:3000/admin
# Expected: 307 → /login?redirectTo=/admin
```

### Test 2: Customer không vào được /admin
1. Đăng ký tài khoản mới (không có role)
2. Đăng nhập
3. Truy cập `/admin` → bị redirect về `/`

### Test 3: Verify RLS trong Supabase Studio
```sql
-- Kiểm tra anonymous không đọc được orders
SET LOCAL role = anon;
SELECT * FROM orders LIMIT 5;
-- Expected: 0 rows (RLS blocks)

-- Kiểm tra customer không đọc được catalog với status=draft
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "<customer-uuid>"}';
SELECT * FROM products WHERE status = 'draft';
-- Expected: 0 rows

-- Kiểm tra admin xem được tất cả
SET LOCAL "request.jwt.claims" = '{"sub": "<admin-uuid>"}';
SELECT * FROM products WHERE status = 'draft';
-- Expected: rows returned (vì admin RLS policy đã thêm)
```

### Test 4: Customer không mutate catalog
```sql
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "<customer-uuid>"}';
INSERT INTO products (name, slug, base_price) VALUES ('Test hack', 'hack', 1000);
-- Expected: ERROR: new row violates row-level security policy
```

---

## 4. Supabase Storage – Upload ảnh sản phẩm

### Qua Admin UI
1. Vào `/admin/products/{id}/edit`
2. Tab **Hình ảnh**
3. Dán URL ảnh vào ô nhập và bấm **Thêm**

### Upload file trực tiếp (programmatic)
Trong client component admin, dùng Supabase Storage client:

```typescript
const supabase = createClient()
const file = // File từ input
const path = `products/${productId}/${Date.now()}-${file.name}`

const { data, error } = await supabase.storage
  .from('product-images')
  .upload(path, file, { cacheControl: '3600', upsert: false })

if (data) {
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(data.path)
  
  // Lưu publicUrl vào product_images table
  await addProductImageUrl(productId, publicUrl)
}
```

---

## 5. Thêm Đội lắp đặt & Xe vận chuyển

Chạy SQL trong Supabase Studio:

```sql
-- Thêm đội lắp đặt
INSERT INTO installation_teams (name, leader_name, phone)
VALUES
  ('Đội A - Hà Nội', 'Nguyễn Văn A', '0901234567'),
  ('Đội B - HCM', 'Trần Văn B', '0912345678');

-- Thêm xe vận chuyển
INSERT INTO delivery_vehicles (license_plate, vehicle_type, capacity_kg)
VALUES
  ('29H-12345', 'truck', 2000),
  ('51C-67890', 'van', 800);
```

---

## 6. Seed dữ liệu mẫu (reset dev)

```sql
-- Reset toàn bộ và seed lại
supabase db reset
-- Sau đó chạy seed files nếu có trong supabase/seed.sql
```

---

## 7. Role Matrix – Quyền hạn chi tiết

| Action | admin | catalog_manager | order_manager | support |
|--------|-------|-----------------|---------------|---------|
| Xem dashboard | ✓ | ✓ | ✓ | ✓ |
| CRUD sản phẩm | ✓ | ✓ | – | – |
| Quản lý kho | ✓ | ✓ | – | – |
| Xem tất cả đơn | ✓ | – | ✓ | ✓ |
| Chuyển trạng thái đơn | ✓ | – | ✓ | – |
| Gán logistics | ✓ | – | ✓ | – |
| Cập nhật thanh toán | ✓ | – | ✓ | – |
| Kiểm duyệt review | ✓ | – | – | ✓ |
| Quản lý phân quyền | ✓ | – | – | – |

---

## 8. Build & Lint trước khi deploy

```bash
# Lint
npm run lint

# Build (kiểm tra TypeScript + compilation)
npm run build

# Start production locally
npm start
```
