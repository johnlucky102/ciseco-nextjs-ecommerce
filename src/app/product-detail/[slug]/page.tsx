import { getProductBySlug, getProductReviews, getRelatedProducts } from "@/lib/supabase/db";
import { Database } from "@/types/supabase";
import { notFound } from "next/navigation";
import ProductDetailClient from "../ProductDetailClient";
import { SupabaseProduct } from "@/components/ProductCard";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  category: Database["public"]["Tables"]["categories"]["Row"] | null;
  room: Database["public"]["Tables"]["rooms"]["Row"] | null;
  product_images: Database["public"]["Tables"]["product_images"]["Row"][];
  product_variants: (Database["public"]["Tables"]["product_variants"]["Row"] & {
    product_variant_materials: (Database["public"]["Tables"]["product_variant_materials"]["Row"] & {
      material: Database["public"]["Tables"]["materials"]["Row"] | null;
    })[];
  })[];
};

type Review = Database["public"]["Tables"]["reviews"]["Row"] & {
  user: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

interface ProductDetailPageProps {
  params: { slug: string };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = await getProductBySlug(params.slug).catch(() => null);

  if (!product) {
    notFound();
  }

  const [reviews, relatedProducts] = await Promise.all([
    getProductReviews(product.id).catch(() => []),
    getRelatedProducts(product.id, product.category_id, product.room_id, 8).catch(() => []),
  ]);

  return (
    <ProductDetailClient
      product={product as Product}
      reviews={(reviews ?? []) as Review[]}
      relatedProducts={(relatedProducts ?? []) as SupabaseProduct[]}
    />
  );
}
