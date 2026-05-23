"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface LikeButtonProps {
  className?: string;
  liked?: boolean;
  variantId?: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  className = "",
  liked = false,
  variantId,
}) => {
  const [isLiked, setIsLiked] = useState(liked);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!variantId) return;
    let cancelled = false;
    async function checkWishlist() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("variant_id", variantId!)
        .maybeSingle();
      if (!cancelled) setIsLiked(!!data);
    }
    checkWishlist();
    return () => { cancelled = true; };
  }, [variantId, supabase]);

  const handleToggle = useCallback(async () => {
    if (loading) return;
    if (!variantId) {
      setIsLiked((v) => !v);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLiked((v) => !v);
      return;
    }
    setLoading(true);
    if (isLiked) {
      await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("variant_id", variantId);
    } else {
      await supabase
        .from("wishlists")
        .insert({ user_id: user.id, variant_id: variantId });
    }
    setIsLiked((v) => !v);
    setLoading(false);
  }, [isLiked, loading, variantId, supabase]);

  return (
    <button
      className={`w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-200 nc-shadow-lg ${className}`}
      onClick={handleToggle}
      disabled={loading}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M12.62 20.81C12.28 20.93 11.72 20.93 11.38 20.81C8.48 19.82 2 15.69 2 8.68998C2 5.59998 4.49 3.09998 7.56 3.09998C9.38 3.09998 10.99 3.97998 12 5.33998C13.01 3.97998 14.63 3.09998 16.44 3.09998C19.51 3.09998 22 5.59998 22 8.68998C22 15.69 15.52 19.82 12.62 20.81Z"
          stroke={isLiked ? "#ef4444" : "currentColor"}
          fill={isLiked ? "#ef4444" : "none"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

export default LikeButton;
