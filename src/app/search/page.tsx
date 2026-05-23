import SectionPromo1 from "@/components/SectionPromo1";
import ProductCard, { SupabaseProduct } from "@/components/ProductCard";
import { searchProducts } from "@/lib/supabase/db";
import SearchForm from "./SearchForm";

interface PageSearchProps {
  searchParams: { q?: string };
}

const PageSearch = async ({ searchParams }: PageSearchProps) => {
  const query = searchParams.q?.trim() || "";
  const products: SupabaseProduct[] = query
    ? ((await searchProducts(query, 24).catch(() => [])) as SupabaseProduct[])
    : [];

  return (
    <div className="nc-PageSearch" data-nc-id="PageSearch">
      <div className="nc-HeadBackgroundCommon h-24 2xl:h-28 top-0 left-0 right-0 w-full bg-primary-50 dark:bg-neutral-800/20" />
      <div className="container">
        <header className="max-w-2xl mx-auto -mt-10 flex flex-col lg:-mt-7">
          <SearchForm defaultValue={query} />
        </header>
      </div>

      <div className="container py-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <main>
          {query && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              {products.length > 0
                ? `Tìm thấy ${products.length} sản phẩm cho "${query}"`
                : `Không tìm thấy sản phẩm nào cho "${query}"`}
            </p>
          )}
          {!query && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Nhập từ khóa để tìm kiếm sản phẩm nội thất.
            </p>
          )}
          {products.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10 mt-8 lg:mt-10">
              {products.map((item) => (
                <ProductCard data={item} key={item.id} />
              ))}
            </div>
          )}
        </main>

        <hr className="border-slate-200 dark:border-slate-700" />
        <SectionPromo1 />
      </div>
    </div>
  );
};

export default PageSearch;
