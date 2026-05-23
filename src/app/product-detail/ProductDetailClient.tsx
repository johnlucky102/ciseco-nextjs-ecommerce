"use client";

import React, { useEffect, useState } from "react";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import LikeButton from "@/components/LikeButton";
import { StarIcon } from "@heroicons/react/24/solid";
import BagIcon from "@/components/BagIcon";
import NcInputNumber from "@/components/NcInputNumber";
import {
  NoSymbolIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import IconDiscount from "@/components/IconDiscount";
import Prices from "@/components/Prices";
import toast from "react-hot-toast";
import SectionSliderProductCard from "@/components/SectionSliderProductCard";
import Policy from "./Policy";
import ReviewItem from "@/components/ReviewItem";
import ButtonSecondary from "@/shared/Button/ButtonSecondary";
import SectionPromo2 from "@/components/SectionPromo2";
import ModalViewAllReviews from "./ModalViewAllReviews";
import NotifyAddTocart from "@/components/NotifyAddTocart";
import Image from "next/image";
import AccordionInfo from "@/components/AccordionInfo";
import { Database } from "@/types/supabase";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SupabaseProduct } from "@/components/ProductCard";

type Product = Database['public']['Tables']['products']['Row'] & {
  category: Database['public']['Tables']['categories']['Row'] | null;
  room: Database['public']['Tables']['rooms']['Row'] | null;
  product_images: Database['public']['Tables']['product_images']['Row'][];
  product_variants: (Database['public']['Tables']['product_variants']['Row'] & {
    product_variant_materials: (Database['public']['Tables']['product_variant_materials']['Row'] & {
      material: Database['public']['Tables']['materials']['Row'] | null;
    })[];
  })[];
};

type Review = Database['public']['Tables']['reviews']['Row'] & {
  user: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

interface ProductDetailClientProps {
  product: Product;
  reviews: Review[];
  relatedProducts?: SupabaseProduct[];
}

export default function ProductDetailClient({ product, reviews, relatedProducts = [] }: ProductDetailClientProps) {
  const [variantActive, setVariantActive] = useState(0);
  const [qualitySelected, setQualitySelected] = useState(1);
  const [isOpenModalViewAllReviews, setIsOpenModalViewAllReviews] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, [supabase]);

  const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0];
  const otherImages = product.product_images.filter(img => img.id !== primaryImage?.id).slice(0, 2);
  const defaultVariant = product.product_variants.find(v => v.is_default) || product.product_variants[0];
  const currentVariant = product.product_variants[variantActive] || defaultVariant;

  const notifyAddTocart = () => {
    toast.custom(
      (t) => (
        <NotifyAddTocart
          productImage={primaryImage?.image_url || ""}
          qualitySelected={qualitySelected}
          show={t.visible}
          sizeSelected={currentVariant?.color || ""}
          variantActive={variantActive}
        />
      ),
      { position: "top-right", id: "nc-product-notify", duration: 3000 }
    );
  };

  const handleAddToCart = async () => {
    const variantId = currentVariant?.id;
    if (!variantId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      router.push("/login");
      return;
    }

    setAddingToCart(true);
    const { error } = await supabase.rpc("add_to_cart", {
      p_user_id: user.id,
      p_variant_id: variantId,
      p_quantity: qualitySelected,
    });

    if (error) {
      toast.error("Không thể thêm vào giỏ hàng.");
    } else {
      notifyAddTocart();
    }
    setAddingToCart(false);
  };

  const renderVariants = () => {
    if (!product.product_variants || !product.product_variants.length) {
      return null;
    }

    return (
      <div>
        <label htmlFor="">
          <span className="text-sm font-medium">
            Màu:
            <span className="ml-1 font-semibold">
              {currentVariant?.color || "Mặc định"}
            </span>
          </span>
        </label>
        <div className="flex mt-3">
          {product.product_variants.map((variant, index) => (
            <div
              key={variant.id}
              onClick={() => setVariantActive(index)}
              className={`relative flex-1 max-w-[75px] h-10 sm:h-11 rounded-full border-2 cursor-pointer ${
                variantActive === index
                  ? "border-primary-6000 dark:border-primary-500"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: variant.color || "#ccc" }}
            >
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDimensions = () => {
    if (!currentVariant?.width || !currentVariant?.height || !currentVariant?.depth) {
      return null;
    }
    return (
      <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <h4 className="text-sm font-semibold mb-2">Kích thước (cm)</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">Rộng:</span>
            <span className="ml-1 font-medium">{currentVariant.width}</span>
          </div>
          <div>
            <span className="text-neutral-500">Cao:</span>
            <span className="ml-1 font-medium">{currentVariant.height}</span>
          </div>
          <div>
            <span className="text-neutral-500">Sâu:</span>
            <span className="ml-1 font-medium">{currentVariant.depth}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMaterials = () => {
    if (!currentVariant?.product_variant_materials || !currentVariant.product_variant_materials.length) {
      return null;
    }
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Chất liệu</h4>
        <div className="flex flex-wrap gap-2">
          {currentVariant.product_variant_materials.map((vm) => (
            <span
              key={vm.id}
              className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm"
            >
              {vm.material?.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderStatus = () => {
    if (!product.status) {
      return null;
    }
    const CLASSES =
      "absolute top-3 left-3 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 nc-shadow-lg rounded-full flex items-center justify-center text-slate-700 text-slate-900 dark:text-slate-300";
    if (product.status === "new") {
      return (
        <div className={CLASSES}>
          <SparklesIcon className="w-3.5 h-3.5" />
          <span className="ml-1 leading-none">Hàng mới</span>
        </div>
      );
    }
    if (product.status === "sale") {
      return (
        <div className={CLASSES}>
          <IconDiscount className="w-3.5 h-3.5" />
          <span className="ml-1 leading-none">Giảm giá</span>
        </div>
      );
    }
    if (product.status === "sold_out") {
      return (
        <div className={CLASSES}>
          <NoSymbolIcon className="w-3.5 h-3.5" />
          <span className="ml-1 leading-none">Hết hàng</span>
        </div>
      );
    }
    if (product.status === "limited") {
      return (
        <div className={CLASSES}>
          <ClockIcon className="w-3.5 h-3.5" />
          <span className="ml-1 leading-none">Phiên bản giới hạn</span>
        </div>
      );
    }
    return null;
  };

  const renderSectionContent = () => {
    return (
      <div className="space-y-7 2xl:space-y-8">
        {/* ---------- 1 HEADING ----------  */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold">
            {product.name}
          </h2>

          <div className="flex items-center mt-5 space-x-4 sm:space-x-5">
            <Prices
              contentClass="py-1 px-2 md:py-1.5 md:px-3 text-lg font-semibold"
              price={currentVariant?.price || 0}
            />

            <div className="h-7 border-l border-slate-300 dark:border-slate-700"></div>

            <div className="flex items-center">
              <a
                href="#reviews"
                className="flex items-center text-sm font-medium"
              >
                <StarIcon className="w-5 h-5 pb-[1px] text-yellow-400" />
                <div className="ml-1.5 flex">
                  <span>4.5</span>
                  <span className="block mx-2">·</span>
                  <span className="text-slate-600 dark:text-slate-400 underline">
                    {reviews.length} đánh giá
                  </span>
                </div>
              </a>
              <span className="hidden sm:block mx-2.5">·</span>
              <div className="hidden sm:flex items-center text-sm">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span className="ml-1 leading-none">{product.category?.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- 2 DESCRIPTION ----------  */}
        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
          <p>{product.description}</p>
        </div>

        {/* ---------- 3 VARIANTS ----------  */}
        <div className="">{renderVariants()}</div>

        {/* ---------- 4 DIMENSIONS & MATERIALS ----------  */}
        {renderDimensions()}
        {renderMaterials()}

        {/*  ---------- 5  QTY AND ADD TO CART BUTTON */}
        <div className="flex space-x-3.5">
          <div className="flex items-center justify-center bg-slate-100/70 dark:bg-slate-800/70 px-2 py-3 sm:p-3.5 rounded-full">
            <NcInputNumber
              defaultValue={qualitySelected}
              onChange={setQualitySelected}
            />
          </div>
          <ButtonPrimary
            className="flex-1 flex-shrink-0"
            onClick={handleAddToCart}
            loading={addingToCart}
          >
            <BagIcon className="hidden sm:inline-block w-5 h-5 mb-0.5" />
            <span className="ml-3">Thêm vào giỏ</span>
          </ButtonPrimary>
        </div>

        {/*  */}
        <hr className=" 2xl:!my-10 border-slate-200 dark:border-slate-700"></hr>
        {/*  */}

        {/* ---------- 6 ----------  */}
        <AccordionInfo />

        {/* ---------- 7 ----------  */}
        <div className="hidden xl:block">
          <Policy />
        </div>
      </div>
    );
  };

  const renderDetailSection = () => {
    return (
      <div className="">
        <h2 className="text-2xl font-semibold">Chi tiết sản phẩm</h2>
        <div className="prose prose-sm sm:prose dark:prose-invert sm:max-w-4xl mt-7">
          <p>{product.description}</p>
          <ul>
            <li>Danh mục: {product.category?.name}</li>
            <li>Không gian: {product.room?.name}</li>
            <li>Trọng lượng: {product.weight} kg</li>
          </ul>
        </div>
      </div>
    );
  };

  const handleSubmitReview = async () => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để viết đánh giá");
      router.push("/login");
      return;
    }
    if (!reviewComment.trim()) {
      toast.error("Đại hãy nhập nội dung nhận xét");
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: product.id,
      user_id: currentUser.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    if (error) {
      toast.error("Không gửi được đánh giá. Vui lòng thử lại.");
    } else {
      toast.success("Đánh giá đã gửi! Sẽ được hiển thị sau khi kiểm duyệt.");
      setReviewComment("");
      setReviewRating(5);
      setReviewSubmitted(true);
    }
    setSubmittingReview(false);
  };

  const renderWriteReview = () => {
    if (reviewSubmitted) {
      return (
        <div className="mt-10 p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl">
          <p className="text-green-700 dark:text-green-300 font-medium">
            ✅ Cảm ơn bạn đã đánh giá! Nhận xét sẽ xuất hiện sau khi được kiểm duyệt.
          </p>
        </div>
      );
    }
    return (
      <div className="mt-10 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Viết đánh giá của bạn</h3>
        {!currentUser && (
          <p className="text-sm text-neutral-500 mb-4">
            <button onClick={() => router.push("/login")} className="text-primary-600 underline">Đăng nhập</button> để viết đánh giá.
          </p>
        )}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setReviewRating(star)}>
              <StarIcon
                className={`w-6 h-6 ${
                  star <= reviewRating ? "text-yellow-400" : "text-slate-300"
                }`}
              />
            </button>
          ))}
          <span className="text-sm text-neutral-500 ml-2">{reviewRating}/5 sao</span>
        </div>
        <textarea
          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={4}
          placeholder="Nhận xét về sản phẩm..."
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          disabled={!currentUser}
        />
        <ButtonPrimary
          className="mt-4"
          onClick={handleSubmitReview}
          loading={submittingReview}
          disabled={!currentUser}
        >
          Gửi đánh giá
        </ButtonPrimary>
      </div>
    );
  };

  const renderReviews = () => {
    return (
      <div className="" id="reviews">
        {/* HEADING */}
        <h2 className="text-2xl font-semibold flex items-center">
          <StarIcon className="w-7 h-7 mb-0.5" />
          <span className="ml-1.5">
            {reviews.length > 0
              ? `${(reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length).toFixed(1)} · ${reviews.length} đánh giá`
              : "Chưa có đánh giá"}
          </span>
        </h2>

        {/* comment */}
        <div className="mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-11 gap-x-28">
            {reviews.slice(0, 4).map((review) => (
              <ReviewItem
                key={review.id}
                data={{
                  comment: review.comment || "",
                  date: new Date(review.created_at || "").toLocaleDateString("vi-VN"),
                  name: review.user?.full_name || "Khách hàng",
                  starPoint: review.rating || 5,
                }}
              />
            ))}
          </div>

          {reviews.length > 4 && (
            <ButtonSecondary
              onClick={() => setIsOpenModalViewAllReviews(true)}
              className="mt-10 border border-slate-300 dark:border-slate-700 "
            >
              Xem tất cả {reviews.length} đánh giá
            </ButtonSecondary>
          )}
        </div>

        {renderWriteReview()}
      </div>
    );
  };

  return (
    <div className={`nc-ProductDetailPage `}>
      {/* MAIn */}
      <main className="container mt-5 lg:mt-11">
        <div className="lg:flex">
          {/* CONTENT */}
          <div className="w-full lg:w-[55%] ">
            {/* HEADING */}
            <div className="relative">
              <div className="aspect-w-16 aspect-h-16 relative">
                {primaryImage && (
                  <Image
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    src={primaryImage.image_url || ""}
                    className="w-full rounded-2xl object-cover"
                    alt={product.name}
                  />
                )}
              </div>
              {renderStatus()}
              {/* META FAVORITES */}
              <LikeButton
                className="absolute right-3 top-3"
                variantId={currentVariant?.id}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 sm:gap-6 sm:mt-6 xl:gap-8 xl:mt-8">
              {otherImages.map((img) => (
                <div
                  key={img.id}
                  className="aspect-w-11 xl:aspect-w-10 2xl:aspect-w-11 aspect-h-16 relative"
                >
                  <Image
                    sizes="(max-width: 640px) 100vw, 33vw"
                    fill
                    src={img.image_url || ""}
                    className="w-full rounded-2xl object-cover"
                    alt={product.name}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="w-full lg:w-[45%] pt-10 lg:pt-0 lg:pl-7 xl:pl-9 2xl:pl-10">
            {renderSectionContent()}
          </div>
        </div>

        {/* DETAIL AND REVIEW */}
        <div className="mt-12 sm:mt-16 space-y-10 sm:space-y-16">
          <div className="block xl:hidden">
            <Policy />
          </div>

          {renderDetailSection()}

          <hr className="border-slate-200 dark:border-slate-700" />

          {renderReviews()}

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* OTHER SECTION */}
          {relatedProducts.length > 0 && (
            <SectionSliderProductCard
              heading="Sản phẩm liên quan"
              subHeading=""
              headingFontClassName="text-2xl font-semibold"
              headingClassName="mb-10 text-neutral-900 dark:text-neutral-50"
              data={relatedProducts}
            />
          )}

          {/* SECTION */}
          <div className="pb-20 xl:pb-28 lg:pt-14">
            <SectionPromo2 />
          </div>
        </div>
      </main>

      {/* MODAL VIEW ALL REVIEW */}
      <ModalViewAllReviews
        show={isOpenModalViewAllReviews}
        onCloseModalViewAllReviews={() => setIsOpenModalViewAllReviews(false)}
      />
    </div>
  );
}
