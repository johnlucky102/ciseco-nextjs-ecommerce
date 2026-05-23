# Cửa Hàng Nội Thất — Next.js + Supabase

Web app bán nội thất xây dựng trên Next.js 14 App Router, TypeScript, Tailwind CSS và Supabase.

---

## Khởi động local

### 1. Yêu cầu
- Node.js 18+
- Docker Desktop (để chạy Supabase Local)
- Supabase CLI: `npm install -g supabase`

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Khởi động Supabase Local
```bash
supabase start
```
Lấy `API URL` và `anon key` từ output rồi tạo file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key từ supabase start>
```

### 4. Chạy migration và seed
```bash
supabase db reset
```
(Seed data nội thất tự động được áp dụng từ `supabase/seed.sql`)

### 5. Khởi động app
```bash
npm run dev
```
Truy cập: http://localhost:3000

---

## Các tính năng chính

| Tính năng | Trạng thái |
|---|---|
| Catalog sản phẩm nội thất (Supabase) | ✅ |
| Product detail `/product-detail/[slug]` | ✅ |
| Bộ lọc: danh mục, không gian, giá, sắp xếp | ✅ |
| Tìm kiếm full-text | ✅ |
| Giỏ hàng (Supabase RPC) | ✅ |
| Checkout & tạo đơn hàng (transaction) | ✅ |
| Đăng ký / Đăng nhập (Supabase Auth) | ✅ |
| Trang tài khoản & lịch sử đơn hàng | ✅ |
| Danh sách yêu thích (wishlists) | ✅ |
| Đánh giá sản phẩm (viết + hiển thị) | ✅ |
| Sản phẩm liên quan | ✅ |
| RLS bảo vệ dữ liệu cá nhân | ✅ |

---

## Cấu trúc thư mục quan trọng

```
src/
├── app/
│   ├── (accounts)/        # Trang tài khoản, đơn hàng, yêu thích
│   ├── collection/        # Danh sách sản phẩm + filter
│   ├── product-detail/[slug]/  # Chi tiết sản phẩm (dynamic)
│   ├── cart/              # Giỏ hàng
│   ├── checkout/          # Thanh toán
│   └── search/            # Tìm kiếm
├── components/
│   ├── ProductCard.tsx    # Card sản phẩm (Supabase + legacy)
│   ├── TabFilters.tsx     # Bộ lọc (URL params)
│   └── LikeButton.tsx     # Nút yêu thích
└── lib/supabase/
    ├── client.ts          # Browser client
    ├── server.ts          # Server client
    └── db.ts              # Data access layer
```

---

## Reset database

```bash
supabase db reset
```

## Build kiểm tra

```bash
npm run build
```

![Homepage](https://raw.githubusercontent.com/UsmanLiaqat404/furzose-nextjs-ecommerce/main/src/images/demos/demo-1.png?token=GHSAT0AAAAAACOEQ7WJW5BLQMOYGQ3QOAJAZP2IUNA)
![Product Page](https://github.com/UsmanLiaqat404/furzose-nextjs-ecommerce/blob/main/src/images/demos/demo-2.png?raw=true)

## Features

- **Modern Design**: furzose boasts a contemporary design crafted to captivate your audience and enhance user experience.
- **Responsive**: Whether your customers are browsing on desktop, tablet, or mobile, furzose ensures a seamless experience across all devices.
- **Smart Search Filter**: Empower your customers with a smart search filter to quickly find what they're looking for.
- **Multi-Vendor Support**: furzose is suited for multi-vendor marketplaces, enabling you to expand your business and collaborate with various sellers.
- **Versatile Use**: From electronics to clothing, furniture to cosmetics, furzose is adaptable to various niches including:
  - Electronics Store
  - Furniture Store
  - Clothing Store
  - Hi-Tech Store
  - Organic/Food Store
  - Cosmetic Store
  - Jewelry Store
  - Sporting Goods Store
  - Accessories Store
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
