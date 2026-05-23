"use client";

import React, { useState } from "react";
import Input from "@/shared/Input/Input";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const PageSignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className={`nc-PageSignUp`} data-nc-id="PageSignUp">
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Đăng ký
        </h2>
        <div className="max-w-md mx-auto space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-lg font-semibold">Đăng ký thành công!</div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Vui lòng kiểm tra email để xác nhận tài khoản.
              </p>
              <Link href="/login" className="text-green-600 underline text-sm">
                Đến trang đăng nhập
              </Link>
            </div>
          ) : (
            <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200">
                  Họ và tên
                </span>
                <Input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  className="mt-1"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200">
                  Email
                </span>
                <Input
                  type="email"
                  placeholder="example@example.com"
                  className="mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200">
                  Mật khẩu
                </span>
                <Input
                  type="password"
                  className="mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <ButtonPrimary type="submit" loading={loading}>
                Đăng ký
              </ButtonPrimary>
            </form>
          )}

          <span className="block text-center text-neutral-700 dark:text-neutral-300">
            Đã có tài khoản?{` `}
            <Link className="text-green-600" href="/login">
              Đăng nhập
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PageSignUp;
