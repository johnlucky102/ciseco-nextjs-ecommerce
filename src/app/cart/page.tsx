"use client";

import NcInputNumber from "@/components/NcInputNumber";
import Prices from "@/components/Prices";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CartItem = {
  id: string;
  quantity: number;
  variant?: {
    id: string;
    price: number | null;
    color: string | null;
    product?: {
      id: string;
      name: string;
      slug: string;
      product_images?: {
        image_url: string;
        alt_text: string | null;
        is_primary: boolean | null;
      }[];
    } | null;
    product_variant_materials?: {
      material_part: string | null;
      material?: { name: string } | null;
    }[];
  } | null;
};

type Cart = {
  id: string;
  cart_items: CartItem[];
};

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

const CartPage = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCart(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("carts")
      .select(
        `
        *,
        cart_items(
          *,
          variant:product_variants(
            id,
            price,
            color,
            product:products(
              id,
              name,
              slug,
              product_images(image_url, alt_text, is_primary)
            ),
            product_variant_materials(
              material_part,
              material:materials(name)
            )
          )
        )
      `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setCart(null);
    } else {
      setCart((data as Cart | null) ?? null);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const cartItems = useMemo(() => cart?.cart_items ?? [], [cart]);
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.variant?.price ?? 0) * item.quantity,
        0
      ),
    [cartItems]
  );

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    setUpdatingId(cartItemId);
    setError(null);

    const { error } = await supabase.rpc("update_cart_item_quantity", {
      p_cart_item_id: cartItemId,
      p_quantity: quantity,
    });

    if (error) {
      setError(error.message);
    } else {
      await loadCart();
    }

    setUpdatingId(null);
  };

  const removeItem = async (cartItemId: string) => {
    setUpdatingId(cartItemId);
    setError(null);

    const { error } = await supabase.rpc("remove_from_cart", {
      p_cart_item_id: cartItemId,
    });

    if (error) {
      setError(error.message);
    } else {
      await loadCart();
    }

    setUpdatingId(null);
  };

  const renderProduct = (item: CartItem) => {
    const product = item.variant?.product;
    const image =
      product?.product_images?.find((image) => image.is_primary)?.image_url ||
      product?.product_images?.[0]?.image_url;
    const price = item.variant?.price ?? 0;
    const productHref = `/product-detail/${product?.slug ?? ""}` as any;
    const materials =
      item.variant?.product_variant_materials
        ?.map((material) => material.material?.name)
        .filter(Boolean)
        .join(", ") || null;

    return (
      <div
        key={item.id}
        className="relative flex py-8 sm:py-10 xl:py-12 first:pt-0 last:pb-0"
      >
        <div className="relative h-36 w-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {image ? (
            <Image
              fill
              src={image}
              alt={product?.name ?? "Product image"}
              sizes="300px"
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              Không có ảnh
            </div>
          )}
          <Link href={productHref} className="absolute inset-0" />
        </div>

        <div className="ml-3 sm:ml-6 flex flex-1 flex-col">
          <div className="flex justify-between">
            <div className="flex-[1.5]">
              <h3 className="text-base font-semibold">
                <Link href={productHref}>{product?.name ?? "Sản phẩm"}</Link>
              </h3>
              <div className="mt-1.5 sm:mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                {item.variant?.color && <span>Màu: {item.variant.color}</span>}
                {materials && <span>Chất liệu: {materials}</span>}
              </div>

              <div className="mt-3 flex justify-between w-full sm:hidden relative">
                <select
                  value={item.quantity}
                  disabled={updatingId === item.id}
                  className="form-select text-sm rounded-md py-1 border-slate-200 dark:border-slate-700 relative z-10 dark:bg-slate-800"
                  onChange={(event) =>
                    updateQuantity(item.id, Number(event.target.value))
                  }
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(
                    (value) => (
                      <option value={value} key={value}>
                        {value}
                      </option>
                    )
                  )}
                </select>
                <Prices
                  contentClass="py-1 px-2 md:py-1.5 md:px-2.5 text-sm font-medium h-full"
                  price={price}
                />
              </div>
            </div>

            <div className="hidden sm:block text-center relative">
              <NcInputNumber
                className="relative z-10"
                defaultValue={item.quantity}
                min={1}
                max={10}
                onChange={(value) => updateQuantity(item.id, value)}
              />
            </div>

            <div className="hidden flex-1 sm:flex justify-end">
              <Prices price={price} className="mt-0.5" />
            </div>
          </div>

          <div className="flex mt-auto pt-4 items-end justify-between text-sm">
            <div className="rounded-full flex items-center justify-center px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="leading-none">Có sẵn</span>
            </div>
            <button
              type="button"
              disabled={updatingId === item.id}
              className="relative z-10 flex items-center mt-3 font-medium text-primary-6000 hover:text-primary-500 text-sm disabled:opacity-50"
              onClick={() => removeItem(item.id)}
            >
              <span>Xoá</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="nc-CartPage">
      <main className="container py-16 lg:pb-28 lg:pt-20">
        <div className="mb-12 sm:mb-16">
          <h2 className="block text-2xl sm:text-3xl lg:text-4xl font-semibold">
            Giỏ hàng
          </h2>
          <div className="block mt-3 sm:mt-5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-400">
            <Link href="/">Trang chủ</Link>
            <span className="text-xs mx-1 sm:mx-1.5">/</span>
            <Link href="/collection">Bộ sưu tập nội thất</Link>
            <span className="text-xs mx-1 sm:mx-1.5">/</span>
            <span className="underline">Giỏ hàng</span>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-700 my-10 xl:my-12" />

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-[60%] xl:w-[55%] divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <div className="py-10 text-center">Đang tải giỏ hàng...</div>
            ) : cartItems.length === 0 ? (
              <div className="py-10 text-center">
                Giỏ hàng của bạn đang trống.
              </div>
            ) : (
              cartItems.map(renderProduct)
            )}
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 my-10 lg:my-0 lg:mx-10 xl:mx-16 2xl:mx-20 flex-shrink-0" />
          <div className="flex-1">
            <div className="sticky top-28">
              <h3 className="text-lg font-semibold">Tóm tắt đơn hàng</h3>
              <div className="mt-7 text-sm text-slate-500 dark:text-slate-400 divide-y divide-slate-200/70 dark:divide-slate-700/80">
                <div className="flex justify-between pb-4">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formatVnd(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between py-4">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    Tính ở bước thanh toán
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-200 text-base pt-4">
                  <span>Tổng cộng</span>
                  <span>{formatVnd(subtotal)}</span>
                </div>
              </div>
              <ButtonPrimary
                href="/checkout"
                className="mt-8 w-full"
                disabled={cartItems.length === 0}
              >
                Thanh toán
              </ButtonPrimary>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CartPage;
