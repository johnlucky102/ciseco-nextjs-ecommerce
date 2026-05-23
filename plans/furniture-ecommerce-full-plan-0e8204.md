# Full ECommerce Furniture Migration Plan

Plan này chuyển template thời trang furzose thành web app bán nội thất hoàn chỉnh với Supabase Local, database chuẩn ngành nội thất, UI tối giản sang trọng, auth, cart, checkout, orders và inventory an toàn.

## Hiện trạng repo

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, SCSS.
- **Dữ liệu hiện tại**: `src/data/data.ts` chứa mock product thời trang với `sizes`, `variants`, `PRODUCTS`.
- **Trang cần tái cấu trúc mạnh**:
  - `src/app/page.tsx`: homepage còn layout thời trang.
  - `src/app/collection/page.tsx`: cần fetch sản phẩm thật + filter.
  - `src/app/product-detail/page.tsx`: còn size S/M/L, ảnh tỉ lệ thời trang, nội dung hard-code.
  - `src/app/cart/page.tsx`: đang render mock `PRODUCTS`, chưa có cart state thật.
  - `src/app/checkout/page.tsx`: đang mock order summary, chưa tạo order.
  - `src/app/login`, `src/app/signup`, `src/app/(accounts)`: cần nối Supabase Auth.
- **Component trọng tâm**:
  - `src/components/ProductCard.tsx`
  - `src/components/Header/CartDropdown.tsx`
  - `src/components/SidebarFilters.tsx`
  - `src/components/TabFilters.tsx`
  - `src/components/SectionSliderProductCard.tsx`

## Kiến trúc dữ liệu mục tiêu

### Nhóm catalog

- **categories**: danh mục sản phẩm, ví dụ Sofa, Bàn ăn, Giường, Tủ, Ghế làm việc.
- **rooms**: không gian sử dụng, ví dụ Phòng khách, Phòng ngủ, Phòng ăn, Phòng làm việc.
- **materials**: chất liệu, ví dụ Gỗ sồi, Gỗ óc chó, Da, Nỉ, Kim loại, Đá.
- **products**:
  - `id`, `slug`, `name`, `description`, `price`, `sale_price`
  - `category_id`, `room_id`
  - `width_cm`, `depth_cm`, `height_cm`, `weight_kg`
  - `origin`, `warranty_months`, `is_featured`, `status`
- **product_images**: nhiều ảnh theo sản phẩm, có `alt`, `sort_order`, `is_primary`.
- **product_variants**: biến thể nội thất theo màu/chất liệu/chân ghế/mặt bàn.
- **product_variant_materials**: map variant với nhiều chất liệu nếu cần.
- **inventory**: tồn kho theo variant, có `quantity`, `reserved_quantity`.

### Nhóm commerce

- **profiles**: thông tin user mở rộng từ Supabase Auth.
- **addresses**: sổ địa chỉ giao hàng.
- **carts** và **cart_items**: giỏ hàng bền vững theo user/session.
- **orders**: đơn hàng, trạng thái, thông tin giao hàng, tổng tiền.
- **order_items**: snapshot sản phẩm tại thời điểm đặt hàng.
- **payments**: trạng thái thanh toán, method, provider reference nếu tích hợp cổng thanh toán sau.
- **reviews**: đánh giá sản phẩm.
- **wishlists**: lưu sản phẩm yêu thích.

### RLS tối thiểu

- **Public select**: `categories`, `rooms`, `materials`, `products`, `product_images`, `product_variants` chỉ với sản phẩm active.
- **Owner only**: `profiles`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `wishlists` theo `auth.uid()`.
- **Order creation**: dùng Server Action/RPC để tránh client tự ghi sai tổng tiền hoặc tự trừ kho.
- **Inventory**: không cho client update trực tiếp; chỉ server/RPC được mutate.

## Roadmap triển khai step by step

## Phase 0: Chuẩn bị môi trường và baseline

1. **Kiểm tra Supabase CLI/Docker**
   - Xác nhận Docker Desktop đang chạy.
   - Chạy `supabase init` nếu repo chưa có thư mục `supabase/`.
   - Chạy `supabase start` để lấy local URL, anon key, service role key, Studio URL.

2. **Kiểm tra app hiện tại**
   - Chạy `npm run dev`.
   - Chạy `npm run lint` và ghi nhận lỗi hiện có trước khi sửa.
   - Chụp mental baseline các route chính: home, collection, product detail, cart, checkout, login/signup.

3. **Quy ước dữ liệu và tiền tệ**
   - Chọn tiền tệ mặc định: VND hoặc USD.
   - Quy ước kích thước dùng cm, cân nặng dùng kg.
   - Quy ước ảnh nội thất ưu tiên tỉ lệ 4:3 hoặc square.

## Phase 1: Supabase Local, migrations, schema và seed

1. **Tạo migration schema**
   - Tạo bảng catalog: `categories`, `rooms`, `materials`, `products`, `product_images`, `product_variants`, `product_variant_materials`, `inventory`.
   - Tạo bảng commerce: `profiles`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `reviews`, `wishlists`.
   - Tạo indexes cho `slug`, `category_id`, `room_id`, `price`, `status`, foreign keys.

2. **Thiết kế function/RPC đặt hàng**
   - Tạo transaction xử lý đặt hàng:
     - kiểm tra tồn kho;
     - lock dòng inventory;
     - tạo `orders` và `order_items`;
     - trừ `quantity` hoặc tăng `reserved_quantity`;
     - trả order id.

3. **Bật RLS và policies**
   - Public đọc catalog active.
   - User chỉ đọc/sửa dữ liệu cá nhân.
   - Không cho client update `inventory`, `orders.total_amount` trực tiếp.

4. **Seed data nội thất**
   - Tạo `supabase/seed.sql` với khoảng 20 sản phẩm.
   - Bao gồm: sofa góc L, sofa đơn, bàn ăn gỗ óc chó, ghế ergonomic, giường, tủ quần áo, kệ TV, bàn trà, đèn sàn.
   - Mỗi sản phẩm có ảnh không gian, kích thước, chất liệu, room, category, variants và inventory.

5. **Generate types**
   - Tạo TypeScript database types từ Supabase để frontend dùng type-safe.

## Phase 2: Supabase client/server integration trong Next.js

1. **Cài package**
   - Thêm `@supabase/supabase-js` và `@supabase/ssr`.

2. **Cấu hình env local**
   - Tạo `.env.local` với `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Chỉ dùng service role ở server nếu thật sự cần, không expose ra client.

3. **Tạo Supabase utilities**
   - Client component browser client.
   - Server component/server action client.
   - Middleware/session helper nếu dùng SSR Auth.

4. **Tạo data access layer**
   - `getProducts(filters)` cho collection.
   - `getProductBySlug(slug)` cho product detail.
   - `getRooms()`, `getCategories()`, `getMaterials()` cho navigation/filter.
   - `getCart()`, `upsertCartItem()`, `removeCartItem()`.

## Phase 3: Tái cấu trúc domain types từ fashion sang furniture

1. **Định nghĩa kiểu dữ liệu nội thất**
   - Thay thế dần `Product` mock bằng `FurnitureProduct`, `FurnitureVariant`, `ProductImage`, `Inventory`.
   - Không sửa ồ ạt toàn bộ; tạo adapter trước để component cũ vẫn chạy trong giai đoạn chuyển tiếp.

2. **Xóa phụ thuộc size quần áo**
   - Loại `sizes`, `allOfSizes`, `variantType` khỏi UI mới.
   - Thay bằng dimensions, materials, finish/color, room, stock.

3. **Chuẩn hóa link sản phẩm**
   - Chuyển từ `/product-detail` cố định sang `/product-detail/[slug]`.
   - Product cards, cart, related products đều link theo slug.

## Phase 4: Rebrand UI sang cửa hàng nội thất

1. **Design system**
   - Đổi palette Tailwind/SCSS sang earthy tones: kem, be, nâu gỗ, xám xi măng, đen than.
   - Giảm cảm giác fashion/rực rỡ, tăng spacing và typography cao cấp.

2. **Homepage**
   - Hero nội thất: headline theo không gian sống.
   - Section “Shop by Room”: Phòng khách, Phòng ngủ, Phòng ăn, Phòng làm việc.
   - Section featured products từ Supabase.
   - Section chất liệu nổi bật: gỗ óc chó, gỗ sồi, da, nỉ, kim loại.

3. **Navigation/Header/Footer**
   - Sửa menu trong `src/data/navigation.ts` hoặc chuyển sang data từ DB.
   - Header categories phù hợp nội thất.
   - Cart dropdown dùng cart thật thay vì `PRODUCTS[0..2]`.

4. **Ảnh và aspect ratio**
   - Sửa `ProductCard.tsx` và gallery product detail sang `aspect-[4/3]` hoặc `aspect-square`.
   - Dùng `object-cover` cho ảnh không gian, `object-contain` nếu là ảnh packshot sản phẩm.

## Phase 5: Collection, filters và search

1. **Collection page server-side**
   - Fetch sản phẩm từ Supabase theo query params.
   - Hỗ trợ filter: room, category, material, price range, availability, sort.

2. **Filter UX**
   - Tái cấu trúc `SidebarFilters.tsx` và `TabFilters.tsx`.
   - Bỏ filter size/quần áo.
   - Thêm material, dimensions, room, stock.

3. **Query params**
   - Dùng URL làm source of truth để share link filter.
   - Mapping sang Supabase `.eq()`, `.in()`, `.gte()`, `.lte()`, `.order()`.

4. **Search page**
   - Tìm theo tên sản phẩm, mô tả, category, material.
   - Có thể bắt đầu bằng `ilike`, nâng cấp full-text search sau.

## Phase 6: Product detail furniture-first

1. **Route động theo slug**
   - Tạo hoặc chuyển sang `/product-detail/[slug]`.
   - Fetch product + images + variants + materials + inventory.

2. **Thông số kỹ thuật**
   - Thay size chart bằng bảng:
     - Dài/Rộng/Cao;
     - Chất liệu bề mặt;
     - Chất liệu chân/khung;
     - Xuất xứ;
     - Bảo hành;
     - Khối lượng chịu tải nếu có.

3. **Variant selector nội thất**
   - Chọn màu hoàn thiện, chất liệu vải/da, chất liệu chân, mặt bàn.
   - Hiển thị tồn kho theo variant.

4. **Add to cart thật**
   - Khi add cart, lưu variant id + quantity.
   - Nếu chưa đăng nhập: tạm dùng local/session cart; khi login thì merge.

## Phase 7: Auth, account và address book

1. **Supabase Auth**
   - Kết nối login/signup/forgot-password hiện có với Supabase.
   - Xử lý session bằng `@supabase/ssr`.

2. **Profile**
   - Tạo profile sau signup.
   - Account page hiển thị thông tin cá nhân.

3. **Address book**
   - Cho user thêm/sửa/xóa địa chỉ.
   - Checkout dùng địa chỉ đã lưu hoặc nhập mới.

4. **Order history**
   - Account orders fetch từ bảng `orders` theo `auth.uid()`.

## Phase 8: Cart, checkout và order transaction

1. **Cart state thật**
   - Tạo cart store/hook thống nhất cho header dropdown, cart page, checkout.
   - Đồng bộ với Supabase khi user logged in.
   - Tính subtotal/tax/shipping từ dữ liệu thật.

2. **Cart page**
   - Render `cart_items` thay vì mock `PRODUCTS`.
   - Update quantity, remove item, check stock.

3. **Checkout page**
   - Form contact/shipping/payment lưu state rõ ràng.
   - Validate required fields.
   - Order summary lấy từ cart thật.

4. **Server Action confirm order**
   - Gọi RPC transaction đặt hàng.
   - Không tin dữ liệu giá/tổng tiền từ client.
   - Hiển thị success/failure rõ ràng.

5. **Inventory overbooking protection**
   - Dùng transaction và row locking trong function SQL.
   - Nếu hết hàng, báo item nào không đủ tồn.

## Phase 9: Reviews, wishlist và polish eCommerce

1. **Wishlist**
   - LikeButton ghi vào bảng `wishlists`.
   - Account wishlist page.

2. **Reviews**
   - Chỉ user đã mua mới được review nếu muốn chặt chẽ.
   - Product detail hiển thị rating aggregate.

3. **Related products**
   - Dựa theo room/category/material thay vì random mock.

4. **Content polish**
   - Dịch các text tiếng Anh sang tiếng Việt nếu website target Việt Nam.
   - Chuẩn hóa tiền VND và format giá.

## Phase 10: Testing, quality và handoff

1. **Test chức năng chính**
   - Browse product, filter, search.
   - Signup/login/logout.
   - Add cart, update quantity, checkout.
   - Kiểm tra order trong Supabase Studio.
   - Kiểm tra trừ kho đúng khi đặt hàng.

2. **Test bảo mật RLS**
   - User A không đọc được order/address của User B.
   - Anonymous không ghi được order/cart user.
   - Client không update được inventory.

3. **Build/lint**
   - Chạy `npm run lint`.
   - Chạy `npm run build`.
   - Fix lỗi TypeScript/Next image/env nếu có.

4. **Tài liệu vận hành local**
   - Ghi README ngắn: start Supabase, seed, start app, reset DB.

## Thứ tự triển khai khuyến nghị

1. Supabase schema + seed + RLS.
2. Supabase client utilities + data access layer.
3. Furniture types + product adapter.
4. Collection page fetch dữ liệu thật.
5. Product detail động theo slug.
6. ProductCard + image ratio + UI nội thất.
7. Cart state thật.
8. Checkout + server action order.
9. Auth + address + order history.
10. Wishlist/reviews + polish + tests.

## Rủi ro kỹ thuật cần kiểm soát

- **Template đang hard-code nhiều dữ liệu**: cần thay từng route chính, tránh refactor toàn bộ một lần.
- **Product detail đang là client component**: nếu fetch server-side theo slug, cần tách phần server data và client interaction.
- **Cart hiện chưa có state thật**: nên thiết kế store/hook trước khi sửa Header, Cart page, Checkout.
- **Inventory cần transaction**: không nên trừ kho từ client component.
- **Ảnh remote**: nếu dùng ảnh từ domain mới, cần cập nhật `next.config.js` `images.remotePatterns`.
- **Supabase Local keys**: `.env.local` không commit; chỉ commit `.env.example`.

## Definition of Done cho bản Full ECommerce

- Web chạy local với Next.js và Supabase Local.
- Catalog nội thất fetch từ database, không còn phụ thuộc mock fashion data ở các route chính.
- Product detail hiển thị đúng ảnh, biến thể, thông số kỹ thuật nội thất và tồn kho.
- User đăng ký/đăng nhập được, có profile và địa chỉ giao hàng.
- Cart đồng bộ trên header/cart/checkout.
- Checkout tạo order thật và trừ kho an toàn.
- RLS bảo vệ dữ liệu cá nhân và inventory.
- `npm run build` pass trước khi bàn giao.
