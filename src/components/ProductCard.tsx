"use client";

import React, { FC, useState } from "react";
import LikeButton from "./LikeButton";
import Prices from "./Prices";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import ButtonSecondary from "@/shared/Button/ButtonSecondary";
import BagIcon from "./BagIcon";
import toast from "react-hot-toast";
import { Transition } from "@/app/headlessui";
import ModalQuickView from "./ModalQuickView";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import NcImage from "@/shared/NcImage/NcImage";

export interface SupabaseProduct {
  id: string | number;
  slug?: string;
  name: string;
  description?: string | null;
  base_price?: number;
  price?: number;
  image?: any;
  compare_at_price?: number | null;
  status?: string | null;
  is_featured?: boolean | null;
  product_images?: { image_url: string; alt_text?: string | null; is_primary?: boolean | null; sort_order?: number | null }[];
  product_variants?: { id: string; price: number | null; color?: string | null; is_default?: boolean | null }[];
}

export interface ProductCardProps {
  className?: string;
  data?: SupabaseProduct;
  isLiked?: boolean;
}

const ProductCard: FC<ProductCardProps> = ({
  className = "",
  data,
  isLiked,
}) => {
  const [variantActive, setVariantActive] = useState(0);
  const [showModalQuickView, setShowModalQuickView] = useState(false);
  const router = useRouter();

  if (!data) return null;

  const { id, slug, name, description, base_price, price: legacyPrice, image: legacyImage, status, product_images, product_variants } = data;

  const primaryImage = product_images?.find((i) => i.is_primary) || product_images?.[0];
  const imageUrl = primaryImage?.image_url || legacyImage || "";
  const defaultVariant = product_variants?.find((v) => v.is_default) || product_variants?.[0];
  const price = defaultVariant?.price ?? base_price ?? legacyPrice ?? 0;
  const colorVariants = product_variants?.filter((v) => !!v.color) || [];

  const notifyAddTocart = () => {
    toast.custom(
      (t) => (
        <Transition
          appear
          show={t.visible}
          className="p-4 max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-2xl pointer-events-auto ring-1 ring-black/5 dark:ring-white/10 text-slate-900 dark:text-slate-200"
          enter="transition-all duration-150"
          enterFrom="opacity-0 translate-x-20"
          enterTo="opacity-100 translate-x-0"
          leave="transition-all duration-150"
          leaveFrom="opacity-100 translate-x-0"
          leaveTo="opacity-0 translate-x-20"
        >
          <p className="block text-base font-semibold leading-none">
            Đã thêm vào giỏ!
          </p>
          <div className="border-t border-slate-200 dark:border-slate-700 my-4" />
          <div className="flex">
            <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <Image
                width={80}
                height={96}
                src={imageUrl}
                alt={name}
                className="object-cover object-center w-full h-full"
              />
            </div>
            <div className="ms-4 flex flex-1 flex-col">
              <div>
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-base font-medium">{name}</h3>
                    {defaultVariant?.color && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {defaultVariant.color}
                      </p>
                    )}
                  </div>
                  <Prices price={price} className="mt-0.5" />
                </div>
              </div>
              <div className="flex flex-1 items-end justify-between text-sm">
                <p className="text-gray-500 dark:text-slate-400">Số lượng 1</p>
                <button
                  type="button"
                  className="font-medium text-primary-6000 dark:text-primary-500"
                  onClick={(e) => { e.preventDefault(); router.push("/cart"); }}
                >
                  Xem giỏ hàng
                </button>
              </div>
            </div>
          </div>
        </Transition>
      ),
      { position: "top-right", id: String(id || "product-detail"), duration: 3000 }
    );
  };

  const renderColorVariants = () => {
    if (!colorVariants.length) return null;
    return (
      <div className="flex space-x-1">
        {colorVariants.slice(0, 5).map((variant, index) => (
          <div
            key={variant.id}
            onClick={() => setVariantActive(index)}
            className={`relative w-6 h-6 rounded-full overflow-hidden z-10 border-2 cursor-pointer transition-all ${
              variantActive === index ? "border-slate-900 dark:border-slate-100 scale-110" : "border-transparent"
            }`}
            title={variant.color || ""}
            style={{ backgroundColor: variant.color || "#ccc" }}
          />
        ))}
      </div>
    );
  };

  const renderGroupButtons = () => (
    <div className="absolute bottom-0 group-hover:bottom-4 inset-x-1 flex justify-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
      <ButtonPrimary
        className="shadow-lg"
        fontSize="text-xs"
        sizeClass="py-2 px-4"
        onClick={() => notifyAddTocart()}
      >
        <BagIcon className="w-3.5 h-3.5 mb-0.5" />
        <span className="ms-1">Thêm vào giỏ</span>
      </ButtonPrimary>
      <ButtonSecondary
        className="ms-1.5 bg-white hover:!bg-gray-100 hover:text-slate-900 transition-colors shadow-lg"
        fontSize="text-xs"
        sizeClass="py-2 px-4"
        onClick={() => setShowModalQuickView(true)}
      >
        <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
        <span className="ms-1">Xem nhanh</span>
      </ButtonSecondary>
    </div>
  );

  const productHref = slug ? (`/product-detail/${slug}` as any) : ("/product-detail" as any);

  return (
    <>
      <div className={`nc-ProductCard relative flex flex-col bg-transparent ${className}`}>
        <Link href={productHref} className="absolute inset-0"></Link>

        <div className="relative flex-shrink-0 bg-slate-50 dark:bg-slate-300 rounded-3xl overflow-hidden z-1 group">
          <Link href={productHref} className="block">
            <NcImage
              containerClassName="flex aspect-w-11 aspect-h-12 w-full h-0"
              src={imageUrl}
              className="object-cover w-full h-full drop-shadow-xl"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 40vw"
              alt={primaryImage?.alt_text || name}
            />
          </Link>
          {status === "on_sale" && (
            <div className="absolute top-3 start-3 px-2.5 py-1.5 text-xs bg-white rounded-full font-medium text-slate-900">
              Giảm giá
            </div>
          )}
          <LikeButton liked={isLiked} className="absolute top-3 end-3 z-10" />
          {renderGroupButtons()}
        </div>

        <div className="space-y-4 px-2.5 pt-5 pb-2.5">
          {renderColorVariants()}
          <div>
            <h2 className="nc-ProductCard__title text-base font-semibold transition-colors">
              {name}
            </h2>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <div className="flex justify-between items-end">
            <Prices price={price} />
          </div>
        </div>
      </div>

      {/* QUICKVIEW */}
      <ModalQuickView
        show={showModalQuickView}
        onCloseModalQuickView={() => setShowModalQuickView(false)}
      />
    </>
  );
};

export default ProductCard;
