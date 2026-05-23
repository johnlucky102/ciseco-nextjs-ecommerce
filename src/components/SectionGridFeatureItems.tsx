import React, { FC } from "react";
import HeaderFilterSection from "@/components/HeaderFilterSection";
import ProductCard, { SupabaseProduct } from "@/components/ProductCard";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";

//
export interface SectionGridFeatureItemsProps {
  data?: SupabaseProduct[];
  products?: SupabaseProduct[];
}

const SectionGridFeatureItems: FC<SectionGridFeatureItemsProps> = ({
  data,
  products,
}) => {
  const items = data || products || [];
  return (
    <div className="nc-SectionGridFeatureItems relative">
      <HeaderFilterSection />
      <div
        className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 `}
      >
        {items.map((item, index) => (
          <ProductCard data={item} key={index} />
        ))}
      </div>
      <div className="flex mt-16 justify-center items-center">
        <ButtonPrimary loading>Show me more</ButtonPrimary>
      </div>
    </div>
  );
};

export default SectionGridFeatureItems;
