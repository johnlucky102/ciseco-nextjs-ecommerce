"use client";

import ProductCard, { SupabaseProduct } from "@/components/ProductCard";
import ButtonSecondary from "@/shared/Button/ButtonSecondary";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type WishlistItem = {
  id: string;
  variant?: {
    id: string;
    price: number | null;
    color: string | null;
    product?: SupabaseProduct | null;
  } | null;
};

const AccountSavelists = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select(
        `
        *,
        variant:product_variants(
          id,
          price,
          color,
          product:products(
            id,
            slug,
            name,
            description,
            base_price,
            compare_at_price,
            status,
            is_featured,
            product_images(image_url, alt_text, is_primary, sort_order),
            product_variants(id, price, color, is_default)
          )
        )
      `
      )
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      setItems([]);
    } else {
      setItems((data as WishlistItem[]) ?? []);
    }

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const products = items
    .map((item) => item.variant?.product)
    .filter(Boolean) as SupabaseProduct[];

  return (
    <div className="space-y-10 sm:space-y-12">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold">
          Sản phẩm yêu thích
        </h2>
      </div>
      {error && <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div>Đang tải danh sách yêu thích...</div>
      ) : products.length === 0 ? (
        <div>Bạn chưa lưu sản phẩm nào.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} data={product} isLiked />
          ))}
        </div>
      )}
      <div className="flex !mt-20 justify-center items-center">
        <ButtonSecondary href="/collection">Tiếp tục mua sắm</ButtonSecondary>
      </div>
    </div>
  );
};

export default AccountSavelists;
