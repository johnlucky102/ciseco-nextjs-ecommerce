# Plan Test Toàn Diện Nghiệp Vụ Các Màn Hình (Storefront + Admin)

Viết Component tests (React Testing Library) + Integration tests cho toàn bộ màn hình sản phẩm, giỏ hàng, thanh toán, tài khoản, và admin — bao phủ render, user interactions, form validation, business logic, error handling.

---

## Hiện trạng

**Đã có (11 suites, 284 tests):** unit tests (constants, utils), integration tests (data layer, server actions, middleware).

**Chưa có:** Component tests cho bất kỳ UI nào. Chưa test render, form validation, user interaction, toast messages, loading states.

---

## Phase 1 — Admin Components (Ưu tiên cao, nhiều nghiệp vụ)

### 1A. `ProductFormClient` (~15 tests)
File: `__tests__/components/admin/ProductFormClient.test.tsx`

| Test case | Loại |
|-----------|------|
| Render mode create: hiển thị form trống, 3 tabs (Thông tin / Hình ảnh / Biến thể) | render |
| Render mode edit: fill initialData đúng vào các field | render |
| `slugify()` tự sinh slug từ name khi gõ | interaction |
| Validate required fields: name, slug, base_price trống → không submit | validation |
| base_price, compare_at_price: parse number đúng từ input | validation |
| FormData mapping: đúng 14 fields khi submit create | integration |
| Optional fields trống → null (compare_at_price, cost_price, sku) | integration |
| is_featured / is_new checkbox toggle | interaction |
| Tab switching: click tab Hình ảnh / Biến thể | interaction |
| Submit thành công → toast.success + router.push | integration |
| Submit lỗi → toast.error, không navigate | error |
| Delete image → gọi deleteProductImage | interaction |
| Set primary image → gọi setPrimaryImage | interaction |
| Loading state (isPending) disable submit button | UX |

### 1B. `OrderStatusActions` (~12 tests)
File: `__tests__/components/admin/OrderStatusActions.test.tsx`

| Test case | Loại |
|-----------|------|
| Render: hiển thị buttons cho VALID_NEXT_STATUSES[currentStatus] | render |
| Status "pending" → hiển thị "Xác nhận" + "Huỷ" buttons | render |
| Status "delivered" → không hiển thị button chuyển trạng thái | render |
| Click status button → confirm dialog → gọi updateOrderStatus | interaction |
| updateOrderStatus thành công → toast.success + router.refresh | integration |
| updateOrderStatus lỗi → toast.error | error |
| Payment status buttons: hiển thị cho pending_payment | render |
| Update payment status thành công → toast + refresh | integration |
| Logistics form: toggle show/hide | interaction |
| Logistics form: submit upsertOrderFulfillment với đúng data | integration |
| Note field: truyền note vào updateOrderStatus | interaction |
| isPending → buttons disabled | UX |

### 1C. `InventoryAdjustModal` (~10 tests)
File: `__tests__/components/admin/InventoryAdjustModal.test.tsx`

| Test case | Loại |
|-----------|------|
| Render: hiển thị variant name, current quantity | render |
| Mode toggle: add / subtract / set | interaction |
| Preview quantity: add 5 → currentQuantity + 5 | logic |
| Preview quantity: subtract 3 → currentQuantity - 3 | logic |
| Preview quantity: set 20 → 20 | logic |
| Delta = 0 → toast "Không có thay đổi", không gọi action | validation |
| Preview < 0 → toast.error "Tồn kho không thể âm" | validation |
| Submit thành công → toast.success + router.refresh + onClose | integration |
| Submit lỗi → toast.error | error |
| Reason dropdown: 5 options (Nhập kho, Kiểm kê lệch, ...) | render |

### 1D. `InventoryTable` (~8 tests)
File: `__tests__/components/admin/InventoryTable.test.tsx`

| Test case | Loại |
|-----------|------|
| Render bảng với inventory data, hiển thị product name, quantity | render |
| Low stock indicator (⚠️) khi quantity < threshold | render |
| Click "Điều chỉnh" → mở InventoryAdjustModal | interaction |
| Pagination: hiển thị đúng totalPages, currentPage | render |
| Search/filter: buildQuery tạo URL params đúng | logic |
| Empty state: không có inventory → hiển thị message | render |
| Link product name → /admin/products/[id]/edit | render |
| Reserved quantity hiển thị đúng | render |

### 1E. `VariantMatrix` (~10 tests)
File: `__tests__/components/admin/VariantMatrix.test.tsx`

| Test case | Loại |
|-----------|------|
| Render existing variants từ props | render |
| Add new variant row | interaction |
| Remove variant row (chưa lưu, isNew) | interaction |
| Delete existing variant → gọi deleteVariant action | interaction |
| Material multiselect: chọn/bỏ material | interaction |
| Auto-generate matrix button (material × color) | interaction |
| Save variants → gọi upsertVariants với đúng payload | integration |
| Validate: name + price required | validation |
| Default variant toggle: chỉ 1 default tại 1 thời điểm | logic |
| Save error → toast.error | error |

### 1F. `RolesManager` (~10 tests)
File: `__tests__/components/admin/RolesManager.test.tsx`

| Test case | Loại |
|-----------|------|
| Render danh sách users with roles | render |
| Role badges: đúng color theo role | render |
| Search user by email → gọi Supabase profiles query | interaction |
| Search empty → không gọi query | validation |
| Select user từ kết quả search | interaction |
| Assign role → gọi assignRole action | integration |
| Revoke role → confirm → gọi revokeRole action | interaction |
| Assign duplicate → hiển thị error "đã có role" | error |
| ROLE_OPTIONS: 4 options (admin, catalog_manager, order_manager, support) | render |
| isPending → buttons disabled | UX |

### 1G. `AdminNav` + `AdminTopbar` (~6 tests)
File: `__tests__/components/admin/AdminLayout.test.tsx`

| Test case | Loại |
|-----------|------|
| AdminNav: render 5 nav links đúng href/label | render |
| AdminNav: active link highlight dựa trên pathname | render |
| AdminNav: exact match cho Dashboard (/) vs Products (/products) | logic |
| AdminTopbar: hiển thị user email | render |
| AdminTopbar: hiển thị role label (Vietnamese) | render |
| AdminTopbar: logout → signOut + redirect /login | interaction |

---

## Phase 2 — Storefront Components

### 2A. `ProductDetailClient` (~12 tests)
File: `__tests__/components/storefront/ProductDetailClient.test.tsx`

### 2B. `LikeButton` (~8 tests)
File: `__tests__/components/storefront/LikeButton.test.tsx`

### 2C. `CartPage` (~10 tests)
File: `__tests__/components/storefront/CartPage.test.tsx`

### 2D. `CheckoutPage` (~10 tests)
File: `__tests__/components/storefront/CheckoutPage.test.tsx`

### 2E. `LoginPage` + `SignupPage` (~8 tests)
File: `__tests__/components/storefront/AuthPages.test.tsx`

### 2F. `AccountPage` + `AccountOrderPage` + `WishlistPage` (~10 tests)
File: `__tests__/components/storefront/AccountPages.test.tsx`

---

## Phase 3 — Business Logic Integration Tests (mở rộng)

### 3A. Order Lifecycle Workflow (~8 tests)
File: `__tests__/integration/workflows/order-lifecycle.test.ts`

### 3B. Inventory Workflow (~5 tests)
File: `__tests__/integration/workflows/inventory-workflow.test.ts`

---

## Execution Plan

| Phase | Số tests ước tính | Files mới | Ưu tiên |
|-------|-------------------|-----------|---------|
| 1A-1G | ~71 tests | 7 files | 🔴 High |
| 2A-2F | ~58 tests | 6 files | 🔴 High |
| 3A-3B | ~13 tests | 2 files | 🟡 Medium |
| **Tổng** | **~142 tests mới** | **15 files** | |

**Tổng sau khi hoàn thành: ~426 tests (284 hiện tại + 142 mới)**

---

## Kỹ thuật chung

- **Mock Supabase client**: `jest.mock('@/lib/supabase/client')`
- **Mock `next/navigation`**: `useRouter` → `{ push, refresh, back }`, `usePathname` → pathname string
- **Mock `react-hot-toast`**: `jest.mock('react-hot-toast')`
- **React Testing Library**: `render`, `screen`, `fireEvent`, `waitFor`, `userEvent`
- **`jest-environment-jsdom`** cho tất cả component tests (default)
- **No E2E** — chỉ unit + integration + component level
