# Full Admin Management Extension Plan

Plan này mở rộng hệ thống bán nội thất hiện tại bằng phân hệ Back-office/Admin Dashboard bảo mật, đồng bộ với Next.js 14 App Router, Supabase Local, RLS, RPC và roadmap Phase 1-10 đã có.

## Bối cảnh kỹ thuật hiện tại

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS.
- **Backend/Data**: Supabase Local, PostgreSQL, RLS đã bật.
- **Catalog hiện có**: `categories`, `rooms`, `materials`, `products`, `product_images`, `product_variants`, `product_variant_materials`, `inventory`.
- **Commerce hiện có**: `profiles`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `reviews`, `wishlists`.
- **Mutation quan trọng**: cart/checkout/order/inventory nên đi qua Server Actions hoặc RPC, không mutate trực tiếp từ client.
- **Admin extension**: thêm route group `app/(admin)/admin/*`, layout riêng, RBAC riêng, policy riêng, không ảnh hưởng UI bán hàng.

## 1. Kiến trúc phân quyền và bảo mật

### 1.1 RBAC bằng bảng `user_roles`

1. **Nguồn sự thật phân quyền**
   - Tạo bảng `user_roles` trong schema `public`.
   - Mỗi dòng map `user_id` từ `auth.users` với `role`.
   - Role khuyến nghị giai đoạn đầu:
     - `admin`: toàn quyền vận hành.
     - `catalog_manager`: quản lý catalog, ảnh, biến thể, tồn kho.
     - `order_manager`: xử lý đơn hàng, thanh toán, logistics.
     - `support`: xem đơn hàng, khách hàng, review; hạn chế quyền ghi.

2. **Schema đề xuất**
   - `user_id uuid references auth.users(id) on delete cascade`.
   - `role text not null check role in (...)`.
   - `created_at timestamptz default now()`.
   - `created_by uuid references auth.users(id)`.
   - Unique constraint: `(user_id, role)`.

3. **Hàm kiểm tra quyền**
   - Tạo SQL function `public.has_role(required_role text)` trả về boolean.
   - Tạo helper `public.is_admin()` trả về true nếu user có role `admin`.
   - Function nên là `security definer`, `stable`, set `search_path = public` để tránh lỗi RLS recursion.

4. **Nguyên tắc quản trị role**
   - Không cho client thường tự insert/update/delete `user_roles`.
   - Chỉ `admin` có thể xem/gán/thu hồi role.
   - Bootstrap admin đầu tiên bằng seed local hoặc migration riêng có hướng dẫn thủ công theo user id.

### 1.2 Middleware bảo vệ `app/(admin)/admin/*`

1. **Route cần bảo vệ**
   - Tất cả path bắt đầu bằng `/admin`.
   - Các route con: `/admin`, `/admin/products`, `/admin/orders`, `/admin/inventory`, `/admin/customers`, `/admin/settings`.

2. **Luồng xử lý middleware**
   - Đọc session bằng `@supabase/ssr` như middleware hiện tại.
   - Nếu chưa đăng nhập:
     - redirect về `/login?redirectTo=/admin...`.
   - Nếu đã đăng nhập:
     - query `user_roles` hoặc gọi RPC `is_admin`/`has_role` bằng server Supabase client.
   - Nếu không có role hợp lệ:
     - redirect `/` hoặc `/account`.
     - Không render shell admin cho customer thường.
   - Nếu hợp lệ:
     - cho request đi tiếp.

3. **Thiết kế matcher**
   - Giữ bảo vệ hiện tại cho `/account`, `/checkout`.
   - Thêm nhánh riêng cho `/admin` vì đây là vùng quyền cao.
   - Middleware chỉ quyết định truy cập route; API/Server Actions vẫn phải kiểm tra quyền lần nữa.

4. **Không tin middleware là lớp bảo mật duy nhất**
   - Middleware có thể bị bypass trong một số luồng server-to-server hoặc lỗi cấu hình.
   - RLS và Server Action authorization vẫn là lớp bảo vệ bắt buộc.

### 1.3 RLS bổ sung cho Admin

1. **Catalog tables**
   - Public vẫn chỉ được `SELECT` dữ liệu active.
   - Admin/catalog_manager được `SELECT` toàn bộ, kể cả draft/inactive.
   - Admin/catalog_manager được `INSERT`, `UPDATE`, `DELETE` với:
     - `categories`, `rooms`, `materials`.
     - `products`, `product_images`, `product_variants`, `product_variant_materials`.
     - `inventory`.

2. **Commerce tables**
   - Customer vẫn chỉ đọc dữ liệu của chính họ.
   - Admin/order_manager/support được xem:
     - `profiles`, `addresses` cần thiết cho chăm sóc khách hàng.
     - `orders`, `order_items`, `payments`, `reviews`, `wishlists` theo nhu cầu vận hành.
   - Ghi dữ liệu nên giới hạn:
     - `orders.status`, timestamp trạng thái, note vận hành.
     - `payments.status` nếu có đối soát thủ công.
     - `reviews.is_approved` cho moderation.
   - Không cho admin sửa trực tiếp snapshot giá trong `order_items` nếu không có nghiệp vụ refund/adjustment rõ ràng.

3. **RPC/Server Actions cho mutation nhạy cảm**
   - `admin_update_order_status(order_id, next_status, note)`.
   - `admin_adjust_inventory(variant_id, delta, reason)`.
   - `admin_create_product_with_variants(payload jsonb)`.
   - `admin_approve_review(review_id, is_approved)`.
   - Mỗi RPC phải kiểm tra `has_role(...)` bên trong database.

4. **Audit log bắt buộc**
   - Tạo bảng `admin_audit_logs` để ghi:
     - `admin_user_id`, `action`, `entity_type`, `entity_id`, `before`, `after`, `created_at`.
   - Ghi log khi thay đổi sản phẩm, tồn kho, trạng thái đơn, quyền user.

## 2. Các phân hệ quản lý cốt lõi

## 2.1 Admin Shell và UI foundation

1. **Route group**
   - `src/app/(admin)/admin/layout.tsx` cho admin shell.
   - `src/app/(admin)/admin/page.tsx` cho dashboard.
   - Mỗi module tách thành thư mục riêng: `products`, `orders`, `inventory`, `customers`, `reviews`, `settings`.

2. **Layout tổng thể**
   - Sidebar trái cố định:
     - Dashboard.
     - Catalog.
     - Orders & Logistics.
     - Inventory.
     - Customers.
     - Reviews.
     - Settings/Roles.
   - Topbar:
     - Search nhanh.
     - User menu.
     - Link quay lại storefront.
   - Main content:
     - Table/list view.
     - Drawer/modal cho thao tác nhanh.
     - Form page riêng cho tạo/sửa dữ liệu lớn.

3. **Data fetching pattern**
   - Server Components fetch danh sách, filter, KPI.
   - Client Components chỉ dùng cho form state, upload progress, variant matrix, table interaction.
   - Mutations dùng Server Actions hoặc RPC.

## 2.2 Dashboard tổng quan

1. **KPI cards**
   - Doanh thu hôm nay/tháng này.
   - Số đơn mới chờ duyệt.
   - Số đơn đang sản xuất/giao/lắp đặt.
   - Tồn kho thấp.
   - Tỉ lệ thanh toán thành công.

2. **Biểu đồ**
   - Doanh thu theo ngày trong 30 ngày.
   - Đơn hàng theo trạng thái.
   - Top category/room bán chạy.
   - Top sản phẩm/variant theo số lượng bán.

3. **Bảng vận hành nhanh**
   - Đơn hàng mới nhất.
   - Sản phẩm sắp hết hàng.
   - Review mới cần duyệt.
   - Thanh toán lỗi/cần kiểm tra.

4. **Logic dữ liệu**
   - Tạo SQL views hoặc RPC aggregate để tránh query nặng trực tiếp từ UI.
   - Index cần chú ý: `orders.created_at`, `orders.status`, `order_items.variant_id`, `inventory.quantity`, `inventory.reserved_quantity`.

## 2.3 CMS Catalog nâng cao

1. **Danh sách sản phẩm**
   - Table columns:
     - Ảnh chính.
     - Tên/slug.
     - Category/room.
     - Giá/sale price.
     - Kích thước `width_cm x depth_cm x height_cm`.
     - Trạng thái: draft/active/inactive.
     - Tồn kho tổng.
     - Updated at.
   - Filter:
     - Search theo tên/slug.
     - Category, room, material.
     - Status.
     - Stock low/out of stock.
   - Bulk actions:
     - Publish/unpublish.
     - Assign category/room.
     - Export CSV sau.

2. **Form thêm/sửa sản phẩm nội thất**
   - Section thông tin cơ bản:
     - Tên, slug, mô tả ngắn/dài.
     - Category, room, status, featured.
   - Section giá:
     - Base price, sale price, currency VND.
   - Section thông số kỹ thuật:
     - `width_cm`, `depth_cm`, `height_cm`, `weight_kg`.
     - Origin, warranty_months.
   - Section ảnh:
     - Upload nhiều ảnh lên Supabase Storage bucket `product-images`.
     - Drag/drop reorder.
     - Chọn ảnh chính.
     - Nhập alt text.
     - Validate mime type, dung lượng, aspect ratio khuyến nghị.
   - Section SEO cơ bản:
     - Meta title, meta description nếu mở rộng schema sau.

3. **Supabase Storage cho ảnh**
   - Bucket `product-images` public-read hoặc signed URL tùy chiến lược.
   - Admin only upload/update/delete.
   - Đường dẫn chuẩn: `products/{product_id}/{timestamp}-{safe_filename}`.
   - Không tin file name từ client; sanitize trước khi lưu.
   - Khi xóa ảnh trong DB, cần xóa object trong Storage hoặc đánh dấu orphan cleanup.

4. **Matrix Variant Manager**
   - Input dimensions của ma trận:
     - Chất liệu chính: gỗ sồi, gỗ óc chó, da, nỉ...
     - Màu/finish: walnut, oak, beige, grey, black...
     - Giá chênh lệch: `price_delta` theo tổ hợp.
   - Tự động sinh variants:
     - `variant_name` = `{Material} - {Color}`.
     - `sku` tự sinh theo product slug + code material + code color.
     - `price` = product base price + `price_delta`.
     - `is_active` mặc định true hoặc theo checkbox.
   - UI dạng matrix:
     - Hàng là material.
     - Cột là color/finish.
     - Ô chứa checkbox active, price delta, SKU override.
   - Logic an toàn:
     - Preview variants trước khi submit.
     - Không duplicate SKU.
     - Nếu edit sản phẩm đã có order, không xóa cứng variant; chuyển `is_active = false`.

## 2.4 Quản lý đơn hàng và Logistics Tracker

1. **Danh sách đơn hàng**
   - Table columns:
     - Mã đơn.
     - Khách hàng/số điện thoại.
     - Tổng tiền.
     - Payment status.
     - Order status.
     - Ngày tạo.
     - Người phụ trách.
   - Filter:
     - Status.
     - Payment status.
     - Date range.
     - Search order number/phone/email.

2. **Workflow trạng thái nội thất**
   - `pending`: Chờ duyệt.
   - `confirmed`: Đã xác nhận.
   - `in_production`: Đang sản xuất tại xưởng.
   - `ready_to_ship`: Sẵn sàng giao.
   - `shipping_installing`: Đang giao & lắp đặt.
   - `completed`: Đã nghiệm thu.
   - `cancelled`: Đã hủy.
   - `refunded`: Đã hoàn tiền nếu cần.

3. **Order detail page**
   - Header:
     - Mã đơn, trạng thái, tổng tiền, payment status.
   - Customer panel:
     - Profile, địa chỉ giao hàng, số điện thoại.
   - Items panel:
     - Snapshot sản phẩm, variant, quantity, price, total.
   - Timeline panel:
     - Lịch sử chuyển trạng thái, admin actor, ghi chú.
   - Logistics panel:
     - Ngày hẹn giao/lắp.
     - Đội thợ lắp đặt.
     - Xe tải vận chuyển.
     - Ghi chú kích thước thang máy/cửa ra vào nếu cần.

4. **Bảng logistics mở rộng đề xuất**
   - `installation_teams`: đội thợ, leader, phone, status.
   - `delivery_vehicles`: biển số, loại xe, tải trọng, status.
   - `order_fulfillments`: order_id, team_id, vehicle_id, scheduled_at, started_at, completed_at, proof_images, customer_signature_url, notes.
   - `order_status_events`: order_id, from_status, to_status, actor_id, note, created_at.

5. **Quy tắc chuyển trạng thái**
   - Không cho chuyển từ `pending` sang `completed` trực tiếp.
   - Không cho `cancelled` nếu đã `completed`, trừ quy trình admin đặc biệt.
   - Khi `shipping_installing` cần có lịch giao hoặc thông tin điều phối tối thiểu.
   - Khi `completed` cần ghi timestamp nghiệm thu và optional proof.

## 2.5 Quản lý kho hàng

1. **Inventory list**
   - Table columns:
     - SKU/variant.
     - Product.
     - Quantity thực tế.
     - Reserved quantity.
     - Available = `quantity - reserved_quantity`.
     - Low stock threshold.
     - Updated at.
   - Filter:
     - Low stock.
     - Out of stock.
     - Category/room.
     - Search SKU/product.

2. **Quick update UI**
   - Inline edit số lượng thực tế.
   - Button tăng/giảm nhanh.
   - Modal bắt buộc nhập reason:
     - Nhập kho.
     - Kiểm kê lệch.
     - Hư hỏng.
     - Hoàn hàng.
   - Mọi update gọi RPC `admin_adjust_inventory`.

3. **Reserved quantity**
   - Khi order mới được tạo:
     - RPC checkout tăng `reserved_quantity` hoặc trừ stock theo chiến lược hiện tại.
   - Khi order bị hủy:
     - release reserved quantity.
   - Khi order hoàn tất/giao thành công:
     - giảm quantity thực tế nếu trước đó chỉ reserve.
   - Cần chọn một mô hình nhất quán để tránh double-decrement.

4. **Audit và cảnh báo**
   - Ghi `inventory_adjustments` gồm admin, variant, delta, reason, before/after.
   - Dashboard cảnh báo low stock.
   - Không cho available âm trừ khi có quyền admin đặc biệt và reason rõ ràng.

## 3. Roadmap triển khai step by step

## Phase 11: Admin security foundation và RBAC

### Checklist Phase 11

- [ ] Tạo migration cho bảng `user_roles` với unique constraint `(user_id, role)`.
- [ ] Tạo migration cho bảng `admin_audit_logs`.
- [ ] Tạo SQL function `public.has_role(required_role text)`.
- [ ] Tạo SQL function/helper `public.is_admin()`.
- [ ] Thêm RLS policies cho `user_roles`.
- [ ] Bổ sung admin RLS policies cho catalog tables.
- [ ] Bổ sung admin RLS policies cho commerce tables cần vận hành.
- [ ] Cập nhật middleware để bảo vệ toàn bộ route `/admin`.
- [ ] Tạo route `/admin` tối thiểu để kiểm tra quyền truy cập.
- [ ] Bootstrap tài khoản admin đầu tiên trong Supabase Local.
- [ ] Test anonymous bị redirect khỏi `/admin`.
- [ ] Test customer thường không vào được `/admin`.
- [ ] Test admin vào được `/admin`.
- [ ] Test customer không thể mutate catalog/inventory qua client.

1. **Mục tiêu**
   - Có nền tảng phân quyền admin an toàn trước khi xây UI.

2. **Đầu việc**
   - Tạo migration `user_roles`, `admin_audit_logs`.
   - Tạo function `has_role`, `is_admin`.
   - Thêm RLS cho `user_roles`.
   - Cập nhật middleware bảo vệ `/admin`.
   - Tạo route `/admin` tối thiểu hiển thị access granted.
   - Bootstrap admin local đầu tiên.

3. **Kết quả bàn giao**
   - Anonymous và customer không vào được `/admin`.
   - Admin vào được `/admin`.
   - RLS chặn customer ghi catalog/inventory.

## Phase 12: Admin layout, dashboard và read-only operations

### Checklist Phase 12

- [ ] Tạo route group `src/app/(admin)/admin`.
- [ ] Tạo `admin/layout.tsx` với sidebar, topbar và main content area.
- [ ] Tạo navigation config cho Dashboard, Catalog, Orders, Inventory, Customers, Reviews, Settings.
- [ ] Tạo dashboard page `/admin`.
- [ ] Tạo KPI cards cho doanh thu, đơn hàng mới, đơn đang xử lý, low stock.
- [ ] Tạo SQL view/RPC aggregate cho doanh thu theo khoảng thời gian.
- [ ] Tạo SQL view/RPC aggregate cho order count theo status.
- [ ] Tạo SQL view/RPC aggregate cho top products/variants.
- [ ] Tạo read-only page `/admin/products`.
- [ ] Tạo read-only page `/admin/orders`.
- [ ] Tạo read-only page `/admin/inventory`.
- [ ] Thêm loading state cho các admin pages.
- [ ] Thêm empty state cho bảng dữ liệu.
- [ ] Thêm error state khi fetch Supabase lỗi.
- [ ] Kiểm tra dashboard không query quá nặng trên mỗi request.

1. **Mục tiêu**
   - Có admin shell hoàn chỉnh và dashboard đọc dữ liệu thật.

2. **Đầu việc**
   - Tạo admin layout sidebar/topbar.
   - Tạo dashboard KPI cards.
   - Tạo SQL views/RPC aggregate cho revenue, order count, top products.
   - Tạo pages read-only:
     - `/admin/products`.
     - `/admin/orders`.
     - `/admin/inventory`.
   - Thêm loading, empty state, error state.

3. **Kết quả bàn giao**
   - Admin xem được tình hình kinh doanh và dữ liệu vận hành.
   - Chưa cho mutation lớn nếu RBAC/RLS chưa test xong.

## Phase 13: Catalog CMS và Supabase Storage

### Checklist Phase 13

- [ ] Tạo bucket Supabase Storage `product-images`.
- [ ] Tạo Storage policy cho phép public read ảnh sản phẩm nếu dùng public bucket.
- [ ] Tạo Storage policy chỉ admin/catalog_manager được upload ảnh.
- [ ] Tạo Storage policy chỉ admin/catalog_manager được delete ảnh.
- [ ] Tạo product list table có search/filter/status.
- [ ] Tạo product create form.
- [ ] Tạo product edit form.
- [ ] Validate các field bắt buộc: name, slug, price, category, room, dimensions.
- [ ] Thêm upload nhiều ảnh với progress state.
- [ ] Thêm reorder ảnh và chọn ảnh chính.
- [ ] Lưu metadata ảnh vào `product_images`.
- [ ] Tạo Matrix Variant Manager theo material x color/finish x price delta.
- [ ] Tự sinh SKU và chống duplicate SKU.
- [ ] Tạo inventory ban đầu cho từng variant.
- [ ] Dùng Server Action/RPC để tạo product, variants, images, inventory trong transaction.
- [ ] Khi edit variant đã có order, chuyển `is_active = false` thay vì xóa cứng.
- [ ] Ghi audit log khi tạo/sửa/xóa product, image, variant, inventory.
- [ ] Test sản phẩm `active` hiển thị lại ở storefront.

1. **Mục tiêu**
   - Admin tạo/sửa sản phẩm nội thất đầy đủ, gồm ảnh, dimensions, variants.

2. **Đầu việc**
   - Tạo bucket `product-images` và policy upload admin-only.
   - Xây product create/edit form.
   - Xây multi-image uploader.
   - Xây Matrix Variant Manager.
   - Tạo Server Actions/RPC cho create/update product transaction.
   - Ghi audit log khi thay đổi product/variant/image.

3. **Kết quả bàn giao**
   - Admin tạo sản phẩm mới từ UI.
   - Storefront nhìn thấy sản phẩm khi status là `active`.
   - Variant/inventory được tạo nhất quán.

## Phase 14: Orders, logistics tracker và fulfillment workflow

### Checklist Phase 14

- [ ] Chuẩn hóa danh sách order status cho workflow nội thất.
- [ ] Tạo migration bảng `order_status_events`.
- [ ] Tạo migration bảng `installation_teams`.
- [ ] Tạo migration bảng `delivery_vehicles`.
- [ ] Tạo migration bảng `order_fulfillments`.
- [ ] Tạo RLS policies cho các bảng logistics.
- [ ] Tạo order list page với filter theo status, payment status, date range.
- [ ] Tạo order detail page.
- [ ] Hiển thị customer panel trong order detail.
- [ ] Hiển thị order items snapshot trong order detail.
- [ ] Hiển thị timeline trạng thái đơn hàng.
- [ ] Tạo Server Action/RPC `admin_update_order_status`.
- [ ] Validate transition, không cho nhảy trạng thái sai quy trình.
- [ ] Tạo UI gán đội lắp đặt.
- [ ] Tạo UI gán xe vận chuyển.
- [ ] Tạo UI đặt lịch giao/lắp.
- [ ] Ghi `order_status_events` khi đổi trạng thái.
- [ ] Ghi audit log khi đổi trạng thái hoặc thay đổi logistics assignment.
- [ ] Test không thể chuyển `pending` trực tiếp sang `completed`.
- [ ] Test đơn `completed` không bị hủy thường.

1. **Mục tiêu**
   - Admin vận hành vòng đời đơn hàng nội thất từ duyệt đến nghiệm thu.

2. **Đầu việc**
   - Mở rộng enum/status convention cho orders.
   - Tạo bảng `order_status_events`.
   - Tạo bảng logistics: teams, vehicles, fulfillments.
   - Xây order list/detail.
   - Xây status transition actions có validate.
   - Xây logistics assignment UI.
   - Ghi timeline và audit log.

3. **Kết quả bàn giao**
   - Admin chuyển trạng thái đơn theo workflow hợp lệ.
   - Có timeline trạng thái và thông tin giao/lắp.

## Phase 15: Inventory control, roles management và hardening

### Checklist Phase 15

- [ ] Tạo migration bảng `inventory_adjustments`.
- [ ] Tạo RPC `admin_adjust_inventory`.
- [ ] RPC inventory bắt buộc kiểm tra role admin/catalog_manager.
- [ ] RPC inventory bắt buộc nhập `reason`.
- [ ] Ghi before/after quantity vào `inventory_adjustments`.
- [ ] Tạo inventory page có available = `quantity - reserved_quantity`.
- [ ] Tạo filter low stock/out of stock.
- [ ] Tạo quick update UI cho quantity thực tế.
- [ ] Chặn available âm nếu không có quyền đặc biệt.
- [ ] Thống nhất mô hình reserve/trừ kho với RPC checkout hiện có.
- [ ] Tạo roles management page.
- [ ] Admin có thể gán role cho user.
- [ ] Admin có thể thu hồi role của user.
- [ ] Không cho admin tự xóa role admin cuối cùng nếu chưa có người thay thế.
- [ ] Test RLS bằng anonymous, customer, support, order_manager, catalog_manager, admin.
- [ ] Chạy `npm run lint`.
- [ ] Chạy `npm run build`.
- [ ] Cập nhật tài liệu bootstrap admin local.
- [ ] Cập nhật tài liệu test RLS/admin access.
- [ ] Cập nhật tài liệu vận hành Storage và inventory adjustment.

1. **Mục tiêu**
   - Hoàn thiện kiểm soát kho, quản trị người dùng admin, test bảo mật và build.

2. **Đầu việc**
   - Xây inventory quick update.
   - Tạo RPC `admin_adjust_inventory`.
   - Tạo bảng `inventory_adjustments`.
   - Xây roles management page cho admin gán/thu hồi role.
   - Test RLS bằng nhiều tài khoản.
   - Chạy lint/build.
   - Viết checklist vận hành admin trong README hoặc docs.

3. **Kết quả bàn giao**
   - Inventory mutate an toàn, có reason và audit.
   - Admin có thể quản lý role.
   - Phân hệ admin đạt chuẩn nghiệm thu.

## 4. Rủi ro kỹ thuật cần kiểm soát

1. **Rò rỉ quyền do chỉ kiểm tra ở UI**
   - Không ẩn button là đủ.
   - Mọi Server Action/RPC phải kiểm tra role.
   - RLS là lớp bắt buộc.

2. **RLS recursion hoặc policy quá phức tạp**
   - Không viết policy query trực tiếp `user_roles` lặp gây recursion.
   - Dùng function `security definer` được kiểm thử.

3. **Service role bị expose**
   - Không dùng service role trong Client Component.
   - Không prefix env service key bằng `NEXT_PUBLIC_`.

4. **Admin dashboard query nặng**
   - Dashboard aggregate có thể làm chậm app nếu join lớn trực tiếp.
   - Dùng view/RPC/index, giới hạn date range mặc định.

5. **Xung đột CSS/storefront layout**
   - Admin nên có route group và layout riêng.
   - Tránh sửa global styles ảnh hưởng trang bán hàng.

6. **Storage file security**
   - Chặn upload file nguy hiểm.
   - Validate mime type và size.
   - Sanitize path/file name.
   - Policy upload/delete admin-only.

7. **Xóa variant đã có order**
   - Không hard delete variant nếu đã phát sinh `order_items`.
   - Dùng `is_active = false` để giữ lịch sử đơn hàng.

8. **Sai lệch inventory reserved/quantity**
   - Phải thống nhất mô hình reserve/trừ kho.
   - Mọi thay đổi stock đi qua transaction/RPC.
   - Có adjustment log để truy vết.

9. **Workflow đơn hàng nội thất phức tạp**
   - Cần validate trạng thái chuyển tiếp.
   - Cần timeline để debug vận hành.
   - Tránh cho admin sửa trực tiếp status bằng update table thô.

## Definition of Done cho phân hệ Admin

- **RBAC**: Có `user_roles`, helper function role, middleware `/admin`, RLS admin policies.
- **Security**: Anonymous/customer không truy cập được admin route, không mutate được catalog/commerce/inventory trái phép.
- **Admin layout**: Có sidebar/topbar riêng, không ảnh hưởng storefront.
- **Dashboard**: Hiển thị KPI doanh thu, đơn hàng, top products, low stock từ dữ liệu thật.
- **Catalog CMS**: Admin tạo/sửa sản phẩm, ảnh, dimensions, variants, inventory ban đầu.
- **Variant Matrix**: Sinh biến thể theo material x color/finish x price delta, chống duplicate SKU.
- **Storage**: Upload nhiều ảnh vào Supabase Storage với policy admin-only và metadata đầy đủ.
- **Orders**: Admin xem order detail, chuyển trạng thái hợp lệ, ghi timeline.
- **Logistics**: Có gán đội lắp đặt, xe vận chuyển, lịch giao/lắp cho đơn hàng.
- **Inventory**: Có quick update, reserved quantity rõ ràng, adjustment reason và audit log.
- **Audit**: Các hành động nhạy cảm ghi `admin_audit_logs` hoặc log chuyên biệt.
- **Quality**: `npm run lint` và `npm run build` pass trước khi bàn giao.
- **Documentation**: Có hướng dẫn bootstrap admin local, test RLS, vận hành Storage và reset seed.

## Thứ tự triển khai khuyến nghị

1. RBAC + middleware + RLS admin.
2. Admin shell + dashboard read-only.
3. Product CMS + Storage.
4. Matrix Variant Manager + inventory initial stock.
5. Order management + status timeline.
6. Logistics tracker.
7. Inventory adjustment + audit.
8. Roles management + security hardening.
9. Lint/build/test handoff.
