"use client";

import Input from "@/shared/Input/Input";
import ButtonCircle from "@/shared/Button/ButtonCircle";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchFormProps {
  defaultValue?: string;
}

export default function SearchForm({ defaultValue = "" }: SearchFormProps) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <label htmlFor="search-input" className="text-neutral-500 dark:text-neutral-300">
        <span className="sr-only">Tìm kiếm sản phẩm</span>
        <Input
          className="shadow-lg border-0 dark:border"
          id="search-input"
          type="search"
          placeholder="Tìm kiếm nội thất..."
          sizeClass="pl-14 py-5 pr-5 md:pl-16"
          rounded="rounded-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <ButtonCircle
          className="absolute right-2.5 top-1/2 transform -translate-y-1/2"
          size=" w-11 h-11"
          type="submit"
        >
          <i className="las la-arrow-right text-xl"></i>
        </ButtonCircle>
        <span className="absolute left-5 top-1/2 transform -translate-y-1/2 text-2xl md:left-6">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 22L20 20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </label>
    </form>
  );
}
