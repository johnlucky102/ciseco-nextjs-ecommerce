# Kế Hoạch Test Toàn Diện — Ciseco Furniture E-commerce

Kế hoạch mở rộng bộ test từ 52 tests hiện tại lên coverage >80% toàn bộ source, bao gồm Unit tests, Integration tests cho nghiệp vụ kinh doanh, Data access layer, Server Actions, Middleware RBAC, và Utility functions. File plan chính thức sẽ được copy vào `plans/comprehensive-testing-plan.md` trong dự án.

---

## Phân Tích Hiện Trạng

| Hạng mục | Đã có test | Chưa test |
|----------|-----------|-----------|
| `src/lib/furniture-utils.ts` | 31 tests | — |
| `src/lib/admin-constants.ts` | Chưa | formatVND, order state machine, payment statuses |
| `src/lib/supabase/db.ts` | Chưa | 18 functions: catalog, cart, order, wishlist, search |
| `src/lib/supabase/admin.ts` | Chưa | 15 functions: dashboard, products, orders, inventory, roles |
| `actions/catalog.ts` | 4 tests (createProduct) | updateProduct, archiveProduct, variants, images |
| `actions/orders.ts` | 17 tests | — |
| `actions/inventory.ts` | Chưa | adjustInventory, setInventoryQuantity |
| `actions/roles.ts` | Chưa | assignRole, revokeRole + audit log |
| `src/middleware.ts` | Chưa | Auth redirect, RBAC gating |
| `src/utils/*.ts` | Chưa | convertNumbThousand, hexToRgb, getTwClassByNumber |

**Hiện tại: 52 tests / 3 files — Mục tiêu: 250+ tests / 12+ files**

---

## PHASE 1: Unit Tests — Pure Functions và Constants (~35 tests)

### File: `__tests__/unit/admin-constants.test.ts`
- [ ] 1.1 `formatVND` — format giá VND đúng locale (số lớn, số 0, làm tròn)
- [ ] 1.2 `ORDER_STATUS_LABELS` — đủ 8+ trạng thái, label tiếng Việt
- [ ] 1.3 `ORDER_STATUS_COLORS` — Tailwind class hợp lệ, đồng bộ keys với labels
- [ ] 1.4 `VALID_NEXT_STATUSES` — State machine: pending→confirmed/cancelled, terminal states, không skip bước
- [ ] 1.5 `PAYMENT_STATUS_LABELS/COLORS` — đủ 4 trạng thái, đồng bộ keys

### File: `__tests__/unit/common-utils.test.ts`
- [ ] 1.6 `convertNumbThousand` — thousands separator EN-US, input 0/undefined
- [ ] 1.7 `hexToRgb` — hex 3 digits (#fff), 6 digits (#ff0000), edge cases
- [ ] 1.8 `getTwClassByNumber` — grid-cols cho mỗi screen size, index ngoài 1-12

---

## PHASE 2: Integration Tests — Storefront Data Layer db.ts (~50 tests)

### File: `__tests__/integration/data-layer/db-catalog.test.ts`
- [ ] 2.1 `getCategories` — query đúng table, filter is_active, order sort_order
- [ ] 2.2 `getRooms` — tương tự getCategories
- [ ] 2.3 `getMaterials` — order by name
- [ ] 2.4 `getProducts` — test từng filter: categoryId, roomId, search, orderBy, pagination
- [ ] 2.5 `getProductBySlug` — single product, nested relations, throw on error
- [ ] 2.6 `getFeaturedProducts` — is_featured=true, limit
- [ ] 2.7 `getNewProducts` — is_new=true, limit
- [ ] 2.8 `getRelatedProducts` — exclude current, filter by category hoặc room
- [ ] 2.9 `searchProducts` — search cả name + description
- [ ] 2.10 `getProductReviews` — filter is_approved, join profiles

### File: `__tests__/integration/data-layer/db-commerce.test.ts`
- [ ] 2.11 `getUserProfile` — single profile by userId
- [ ] 2.12 `getUserAddresses` — list addresses, order by is_default
- [ ] 2.13 `getUserCart` — nested cart_items, handle PGRST116 (no cart)
- [ ] 2.14 `addToCart` — RPC params đúng
- [ ] 2.15 `updateCartItemQuantity` — RPC params đúng
- [ ] 2.16 `removeFromCart` — RPC params đúng
- [ ] 2.17 `getUserOrders` — list orders with nested order_items
- [ ] 2.18 `createOrder` — RPC params (shipping_address JSON, payment_method)
- [ ] 2.19 `getUserWishlist` — nested variant/product/materials
- [ ] 2.20 `addToWishlist` — insert + select + single
- [ ] 2.21 `removeFromWishlist` — delete with 2 eq filters
- [ ] 2.22 Error handling — mỗi function throw error khi Supabase trả lỗi

---

## PHASE 3: Integration Tests — Admin Layer (~60 tests)

### File: `__tests__/integration/data-layer/admin-data.test.ts`
- [ ] 3.1 `getAdminDashboardKPI` — RPC call, error trả null
- [ ] 3.2 `getAdminRecentOrders` — select đúng columns, limit, error trả []
- [ ] 3.3 `getAdminLowStock` — view query, limit 10
- [ ] 3.4 `getAdminTopProducts` — view query, limit 5
- [ ] 3.5 `getAdminProducts` — filter: search/status/category/room/pagination
- [ ] 3.6 `getAdminProductDetail` — single with nested relations
- [ ] 3.7 `getAdminOrders` — filter: status/payment/search/date range/pagination
- [ ] 3.8 `getAdminOrderDetail` — single with nested fulfillments/events
- [ ] 3.9 `getInstallationTeams/getDeliveryVehicles` — filter active
- [ ] 3.10 `getAdminInventory` — filter: search/low_stock/out_of_stock
- [ ] 3.11 `getInventoryAdjustments` — filter by variantId, limit 20
- [ ] 3.12 `getUsersWithRoles` — map data transform (profiles flatten)
- [ ] 3.13 `searchUserByEmail` — ilike search, limit 5

### File: `__tests__/integration/server-actions/catalog-actions.test.ts` (MỞ RỘNG)
- [ ] 3.14 `updateProduct` — FormData mapping, revalidate 2 paths
- [ ] 3.15 `archiveProduct` — update status='archived', revalidate
- [ ] 3.16 `upsertVariants` — new variant (insert + inventory), existing (update)
- [ ] 3.17 `upsertVariants` — material sync (delete old + insert new)
- [ ] 3.18 `deleteVariant` — delete by id, revalidate
- [ ] 3.19 `addProductImageUrl` — insert image, isPrimary flag
- [ ] 3.20 `deleteProductImage` — delete by id
- [ ] 3.21 `setPrimaryImage` — reset all rồi set one primary

### File: `__tests__/integration/server-actions/inventory-actions.test.ts`
- [ ] 3.22 `adjustInventory` — RPC params đúng
- [ ] 3.23 `adjustInventory` — note optional (undefined)
- [ ] 3.24 `adjustInventory` — error handling
- [ ] 3.25 `setInventoryQuantity` — query current rồi calculate delta
- [ ] 3.26 `setInventoryQuantity` — delta=0 trả early return success
- [ ] 3.27 `setInventoryQuantity` — inventory not found trả error

### File: `__tests__/integration/server-actions/roles-actions.test.ts`
- [ ] 3.28 `assignRole` — insert user_roles, write audit log
- [ ] 3.29 `assignRole` — duplicate role (23505) trả friendly Vietnamese error
- [ ] 3.30 `assignRole` — revalidate /admin/settings/roles
- [ ] 3.31 `revokeRole` — delete role, write audit log
- [ ] 3.32 `revokeRole` — error handling, revalidate

---

## PHASE 4: Middleware RBAC Tests (~10 tests)

### File: `__tests__/integration/middleware/middleware.test.ts`
- [ ] 4.1 Mock NextRequest/NextResponse + createServerClient
- [ ] 4.2 /admin khi chưa login → redirect /login?redirectTo=/admin
- [ ] 4.3 /admin khi login nhưng không có role → redirect /
- [ ] 4.4 /admin khi có role admin → pass through
- [ ] 4.5 /admin khi có role catalog_manager → pass through
- [ ] 4.6 /account khi chưa login → redirect /login
- [ ] 4.7 /checkout khi chưa login → redirect /login
- [ ] 4.8 /account khi đã login → pass through
- [ ] 4.9 Trang public (/, /collection) → luôn pass through
- [ ] 4.10 Header x-pathname được set đúng

---

## PHASE 5: Coverage và CI/CD

- [ ] 5.1 Cập nhật `jest.config.js` — mở rộng `collectCoverageFrom`
- [ ] 5.2 Chạy `npx jest --coverage` — verify coverage >80%
- [ ] 5.3 Cập nhật `.github/workflows/test.yml` — coverage threshold
- [ ] 5.4 Copy plan vào `plans/comprehensive-testing-plan.md` trong dự án
- [ ] 5.5 Final verify: tất cả tests PASS

---

## Kỹ Thuật Mock

| Module | Cách mock |
|--------|-----------|
| `@/lib/supabase/server` | `jest.mock` với `const mockClient: any = {}` (đã proven) |
| `@supabase/ssr` (middleware) | Mock `createServerClient` trả mock auth + from |
| `next/server` (middleware) | Mock `NextRequest`, `NextResponse` |
| `next/cache` | Mock `revalidatePath` |
| `next/headers` | Mock `cookies()` |

---

## Thống Kê Dự Kiến

| Metric | Hiện tại | Sau hoàn thành |
|--------|----------|----------------|
| Test files | 3 | 12+ |
| Total tests | 52 | 250+ |
| Coverage (lib/) | 97% furniture-utils only | >80% tổng thể |
| Coverage (actions/) | ~60% | >85% |
| Coverage (middleware) | 0% | >90% |

## Thứ Tự Thực Hiện

1. **Phase 1** (~35 tests) — nhanh nhất, pure functions, không cần mock
2. **Phase 2** (~50 tests) — storefront data layer, mock Supabase chain
3. **Phase 3** (~60 tests) — admin layer + mở rộng server actions
4. **Phase 4** (~10 tests) — middleware (phức tạp nhất do mock NextRequest)
5. **Phase 5** — cleanup, coverage enforcement, CI/CD update