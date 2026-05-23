"use client";

import NcInputNumber from "@/components/NcInputNumber";
import Prices from "@/components/Prices";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import Input from "@/shared/Input/Input";
import Label from "@/components/Label/Label";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  } | null;
};

type Cart = {
  id: string;
  cart_items: CartItem[];
};

type ShippingAddress = {
  full_name: string;
  phone: string;
  email: string;
  address_line: string;
  city: string;
  province: string;
  country: string;
  postal_code: string;
};

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

const CheckoutPage = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    full_name: "",
    phone: "",
    email: "",
    address_line: "",
    city: "",
    province: "",
    country: "Việt Nam",
    postal_code: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const supabase = createClient();
  const router = useRouter();

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCart(null);
      setLoading(false);
      router.push("/login");
      return;
    }

    setShippingAddress((current) => ({
      ...current,
      email: current.email || user.email || "",
      full_name: current.full_name || user.user_metadata?.full_name || "",
    }));

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
  }, [router, supabase]);

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
    const { error } = await supabase.rpc("update_cart_item_quantity", {
      p_cart_item_id: cartItemId,
      p_quantity: quantity,
    });

    if (error) {
      setError(error.message);
    } else {
      await loadCart();
    }
  };

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  };

  const handleConfirmOrder = async () => {
    setError(null);

    if (cartItems.length === 0) {
      setError("Giỏ hàng đang trống.");
      return;
    }

    const requiredFields: (keyof ShippingAddress)[] = [
      "full_name",
      "phone",
      "email",
      "address_line",
      "city",
      "province",
      "country",
    ];

    const missingField = requiredFields.find((field) => !shippingAddress[field]);
    if (missingField) {
      setError("Vui lòng nhập đầy đủ thông tin giao hàng.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      router.push("/login");
      return;
    }

    const { data, error } = await supabase.rpc("create_order_from_cart", {
      p_user_id: user.id,
      p_shipping_address: shippingAddress,
      p_payment_method: paymentMethod,
      p_notes: undefined,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessOrderId(typeof data === "string" ? data : JSON.stringify(data));
      await loadCart();
    }

    setSubmitting(false);
  };

  const renderProduct = (item: CartItem) => {
    const product = item.variant?.product;
    const image =
      product?.product_images?.find((image) => image.is_primary)?.image_url ||
      product?.product_images?.[0]?.image_url;
    const price = item.variant?.price ?? 0;
    const productHref = `/product-detail/${product?.slug ?? ""}` as any;

    return (
      <div key={item.id} className="relative flex py-7 first:pt-0 last:pb-0">
        <div className="relative h-36 w-24 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {image ? (
            <Image
              src={image}
              fill
              alt={product?.name ?? "Product image"}
              className="h-full w-full object-cover object-center"
              sizes="150px"
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
              <div className="mt-1.5 sm:mt-2.5 flex text-sm text-slate-600 dark:text-slate-300">
                {item.variant?.color && <span>Màu: {item.variant.color}</span>}
              </div>
            </div>
            <div className="hidden flex-1 sm:flex justify-end">
              <Prices price={price} className="mt-0.5" />
            </div>
          </div>
          <div className="flex mt-auto pt-4 items-end justify-between text-sm">
            <div className="hidden sm:block text-center relative">
              <NcInputNumber
                className="relative z-10"
                defaultValue={item.quantity}
                min={1}
                max={10}
                onChange={(value) => updateQuantity(item.id, value)}
              />
            </div>
            <span className="text-slate-500 dark:text-slate-400 sm:hidden">
              SL: {item.quantity}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="nc-CheckoutPage">
      <main className="container py-16 lg:pb-28 lg:pt-20">
        <div className="mb-16">
          <h2 className="block text-2xl sm:text-3xl lg:text-4xl font-semibold">
            Thanh toán
          </h2>
          <div className="block mt-3 sm:mt-5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-400">
            <Link href="/">Trang chủ</Link>
            <span className="text-xs mx-1 sm:mx-1.5">/</span>
            <Link href="/collection">Bộ sưu tập nội thất</Link>
            <span className="text-xs mx-1 sm:mx-1.5">/</span>
            <span className="underline">Thanh toán</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {successOrderId && (
          <div className="mb-6 rounded-2xl bg-green-50 px-5 py-4 text-sm text-green-700">
            Đặt hàng thành công. Mã đơn: {successOrderId}
          </div>
        )}

        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 space-y-8">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
              <h3 className="text-lg font-semibold">Thông tin giao hàng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Họ và tên</Label>
                  <Input
                    className="mt-1.5"
                    value={shippingAddress.full_name}
                    onChange={(event) => handleAddressChange("full_name", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Số điện thoại</Label>
                  <Input
                    className="mt-1.5"
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(event) => handleAddressChange("phone", event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input
                  className="mt-1.5"
                  type="email"
                  value={shippingAddress.email}
                  onChange={(event) => handleAddressChange("email", event.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">Địa chỉ</Label>
                <Input
                  className="mt-1.5"
                  value={shippingAddress.address_line}
                  onChange={(event) => handleAddressChange("address_line", event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Thành phố</Label>
                  <Input
                    className="mt-1.5"
                    value={shippingAddress.city}
                    onChange={(event) => handleAddressChange("city", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Tỉnh/Quận</Label>
                  <Input
                    className="mt-1.5"
                    value={shippingAddress.province}
                    onChange={(event) => handleAddressChange("province", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Mã bưu chính</Label>
                  <Input
                    className="mt-1.5"
                    value={shippingAddress.postal_code}
                    onChange={(event) => handleAddressChange("postal_code", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold">Phương thức thanh toán</h3>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                Thanh toán khi nhận hàng
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="payment_method"
                  value="bank_transfer"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                Chuyển khoản ngân hàng
              </label>
            </div>
          </div>

          <div className="flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 my-10 lg:my-0 lg:mx-10 xl:lg:mx-14 2xl:mx-16" />

          <div className="w-full lg:w-[36%]">
            <h3 className="text-lg font-semibold">Tóm tắt đơn hàng</h3>
            <div className="mt-8 divide-y divide-slate-200/70 dark:divide-slate-700">
              {loading ? (
                <div className="py-10 text-center">Đang tải...</div>
              ) : cartItems.length === 0 ? (
                <div className="py-10 text-center">Giỏ hàng của bạn đang trống</div>
              ) : (
                cartItems.map(renderProduct)
              )}
            </div>

            <div className="mt-10 pt-6 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-slate-700">
              <div className="mt-4 flex justify-between py-2.5">
                <span>Tạm tính</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {formatVnd(subtotal)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span>Phí vận chuyển</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  Tính sau
                </span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-200 text-base pt-4">
                <span>Tổng cộng</span>
                <span>{formatVnd(subtotal)}</span>
              </div>
            </div>
            <ButtonPrimary
              className="mt-8 w-full"
              disabled={cartItems.length === 0 || submitting || loading}
              loading={submitting}
              onClick={handleConfirmOrder}
            >
              Xác nhận đặt hàng
            </ButtonPrimary>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
