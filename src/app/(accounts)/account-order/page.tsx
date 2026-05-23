"use client";

import Prices from "@/components/Prices";
import ButtonSecondary from "@/shared/Button/ButtonSecondary";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number | null;
  product_name?: string | null;
  variant_name?: string | null;
};

type Order = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
  order_items?: OrderItem[];
};

const AccountOrder = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const loadOrders = useCallback(async () => {
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
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setOrders([]);
    } else {
      setOrders(((data ?? []) as unknown) as Order[]);
    }

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const renderProductItem = (item: OrderItem) => {
    return (
      <div key={item.id} className="flex py-4 sm:py-7 last:pb-0 first:pt-0">
        <div className="h-24 w-16 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
          Sản phẩm
        </div>

        <div className="ml-4 flex flex-1 flex-col">
          <div>
            <div className="flex justify-between">
              <div>
                <h3 className="text-base font-medium line-clamp-1">
                  {item.product_name || "Sản phẩm"}
                </h3>
                {item.variant_name && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {item.variant_name}
                  </p>
                )}
              </div>
              <Prices price={item.price ?? 0} className="mt-0.5 ml-2" />
            </div>
          </div>
          <div className="flex flex-1 items-end justify-between text-sm">
            <p className="text-gray-500 dark:text-slate-400 flex items-center">
              <span>Số lượng</span>
              <span className="ml-2">{item.quantity}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderOrder = (order: Order) => {
    const createdAt = order.created_at
      ? new Date(order.created_at).toLocaleDateString("vi-VN")
      : "";

    return (
      <div key={order.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden z-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-500/5">
          <div>
            <p className="text-lg font-semibold">#{order.order_number || order.id.slice(0, 8)}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 sm:mt-2">
              <span>{createdAt}</span>
              <span className="mx-2"></span>
              <span className="text-primary-500">{order.status || "pending"}</span>
            </p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-4">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {(order.total_amount ?? 0).toLocaleString("vi-VN")} VND
            </span>
            <ButtonSecondary sizeClass="py-2.5 px-4 sm:px-6" fontSize="text-sm font-medium">
              Chi tiết
            </ButtonSecondary>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 p-2 sm:p-8 divide-y divide-y-slate-200 dark:divide-slate-700">
          {(order.order_items ?? []).map(renderProductItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      <h2 className="text-2xl sm:text-3xl font-semibold">Lịch sử đơn hàng</h2>
      {error && <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div>Đang tải đơn hàng...</div>
      ) : orders.length === 0 ? (
        <div>Bạn chưa có đơn hàng nào.</div>
      ) : (
        orders.map(renderOrder)
      )}
    </div>
  );
};

export default AccountOrder;

