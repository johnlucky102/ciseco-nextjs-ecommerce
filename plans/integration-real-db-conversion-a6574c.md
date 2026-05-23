# Chuyển Integration Tests Sang Real Supabase DB

Kế hoạch này chuyển toàn bộ test trong `__tests__/integration` thành một bộ real-db tests chạy trực tiếp với Supabase local, không thay thế các mock tests hiện có.

## Mục tiêu

- Giữ nguyên `__tests__/integration` để tiếp tục kiểm tra mapping payload và behavior mock.
- Tạo bộ test mới dưới `__tests__/real-db/integration/` dựa trên toàn bộ coverage hiện có.
- Dùng Supabase local từ `.env.test` và hạ tầng `__tests__/real-db/setup/*` hiện có.
- Ưu tiên phát hiện lỗi thật ở DB/RLS/RPC/constraint thay vì chỉ kiểm tra `mockClient` được gọi đúng.

## Phạm vi file nguồn cần chuyển

- `__tests__/integration/data-layer/db-catalog.test.ts`
- `__tests__/integration/data-layer/db-commerce.test.ts`
- `__tests__/integration/data-layer/admin-data.test.ts`
- `__tests__/integration/server-actions/catalog-actions.test.ts`
- `__tests__/integration/server-actions/order-actions.test.ts`
- `__tests__/integration/server-actions/inventory-actions.test.ts`
- `__tests__/integration/server-actions/roles-actions.test.ts`
- `__tests__/integration/workflows/order-lifecycle.test.ts`
- `__tests__/integration/workflows/inventory-workflow.test.ts`

## Chiến lược chuyển đổi

### 1. Chuẩn hóa test harness real-db

- Tận dụng `adminClient`, `anonClient`, `clientForUser` trong `__tests__/real-db/setup/db-client.ts`.
- Tận dụng helpers hiện có trong `seed-helpers.ts` để tạo user/product/variant/inventory.
- Mở rộng helper nếu cần cho:
  - tạo category/room/material
  - tạo address
  - tạo order trực tiếp hoặc qua cart RPC
  - tạo logistics team/vehicle/fulfillment
  - tạo role + audit data
- Không dùng `auth.signInWithPassword`; tiếp tục dùng minted JWT vì local GoTrue đang lỗi.

### 2. Tạo cấu trúc test mới

Tạo các file mới:

- `__tests__/real-db/integration/data-layer-catalog.realdb.test.ts`
- `__tests__/real-db/integration/data-layer-commerce.realdb.test.ts`
- `__tests__/real-db/integration/admin-data.realdb.test.ts`
- `__tests__/real-db/integration/catalog-actions.realdb.test.ts`
- `__tests__/real-db/integration/order-actions.realdb.test.ts`
- `__tests__/real-db/integration/inventory-actions.realdb.test.ts`
- `__tests__/real-db/integration/roles-actions.realdb.test.ts`
- `__tests__/real-db/integration/order-lifecycle.realdb.test.ts`
- `__tests__/real-db/integration/inventory-workflow.realdb.test.ts`

Các test mới sẽ chạy bởi config hiện có vì nằm trong `__tests__/real-db/**/*.test.ts`.

### 3. Chuyển data-layer tests

#### Catalog

Chuyển từ kiểm tra `mockQB` sang kiểm tra dữ liệu thật:

- `getCategories`: chỉ trả `is_active=true`, đúng sort order.
- `getRooms`: chỉ trả active rooms.
- `getMaterials`: chỉ trả active materials.
- `getProducts`: lọc status/price/category/search thực tế.
- `getProductBySlug`: active product visible; archived/draft bị ẩn nếu policy yêu cầu.
- `getFeaturedProducts`, `getNewProducts`, `getRelatedProducts`, `searchProducts`, `getProductReviews`: seed data rồi assert kết quả thật.

#### Commerce

- `getUserProfile`: user chỉ đọc được profile của chính mình.
- `getUserAddresses`: user chỉ đọc address của chính mình, sort default đúng.
- `getUserCart`, `addToCart`, `updateCartItemQuantity`, `removeFromCart`: kiểm tra RPC/table state thật.
- `getUserOrders`, `createOrder`: tạo order từ cart, assert `orders`, `order_items`, `inventory.reserved_quantity`.
- `getUserWishlist`, `addToWishlist`, `removeFromWishlist`: assert RLS ownership + unique behavior.

#### Admin data

- Seed admin role và data thật.
- Test các function đọc admin dashboard, products, orders, inventory, users/roles.
- Kiểm tra regular user không đọc được admin-only data nếu gọi bằng anon/authenticated client.

### 4. Chuyển server-action tests

Các server action hiện mock `@/lib/supabase/server`. Với real DB, cần một trong hai hướng:

- Ưu tiên A: test trực tiếp DB/RPC tương ứng thay vì import server action nếu action phụ thuộc Next cookies.
- Ưu tiên B: mock nhẹ `next/cache`, `next/headers`, nhưng thay `@/lib/supabase/server.createClient` bằng real Supabase client theo role phù hợp.

Áp dụng theo nhóm:

- Catalog actions: `createProduct`, `updateProduct`, `archiveProduct`, variants/images/material refs, unique slug, FK constraints.
- Order actions: `admin_update_order_status`, fulfillment upsert FK, payment status update, create team/vehicle unique constraints.
- Inventory actions: `admin_adjust_inventory`, `setInventoryQuantity`, inventory_adjustments records, negative stock guard.
- Roles actions: assign/revoke role thật, duplicate role constraint, audit log insert, revoke takes effect.

### 5. Chuyển workflow tests

#### Order lifecycle

- Tạo user + product + inventory + order thật.
- Grant `admin` hoặc `order_manager` cho actor.
- Chạy lifecycle thật qua `admin_update_order_status`:
  - confirmed
  - in_production
  - ready_to_ship
  - shipping_installing
  - completed
- Test invalid transitions bằng DB error thật.
- Test fulfillment assignment bằng team/vehicle thật.
- Test payment status update và cancel branch.

#### Inventory workflow

- Tạo product variant + inventory thật.
- Grant role phù hợp.
- Test:
  - import stock
  - damage/write-off
  - manual adjustment
  - set exact quantity via delta
  - insufficient stock / invalid delta
  - adjustment history recorded in `inventory_adjustments`

### 6. Cleanup và isolation

- Mọi seed data dùng slug/email prefix `realdb-it-${Date.now()}`.
- `afterAll` cleanup theo thứ tự:
  - logistics/fulfillment/adjustments
  - orders/order_items/payments
  - cart_items/carts/wishlists/addresses
  - products cascades variants/images/inventory
  - roles/users
- Chạy `--runInBand` để giảm race không mong muốn, trừ test race có chủ đích.

### 7. Verification

Chạy:

```powershell
npm run test:realdb
```

Kỳ vọng sau khi chuyển xong:

- Các test real-db phản ánh behavior thật, không assert `mockClient` calls.
- Các lỗi đã biết B1/B2/B5 vẫn fail cho đến khi DB được fix.
- Test mới có thể phát hiện thêm lỗi constraint/RLS/RPC trong catalog/order/inventory/roles.

## Thứ tự triển khai đề xuất

1. Mở rộng `seed-helpers.ts` cho category/room/material/address/order/logistics.
2. Chuyển `data-layer/db-catalog.test.ts` và `db-commerce.test.ts` trước.
3. Chuyển `inventory-actions` và `inventory-workflow`.
4. Chuyển `roles-actions` và admin RBAC mở rộng.
5. Chuyển `order-actions` và `order-lifecycle`.
6. Chuyển `catalog-actions` vì nhiều CRUD/variant/image edge cases nhất.
7. Chạy toàn bộ `test:realdb`, phân loại failures thành bug thật vs test setup issue.
