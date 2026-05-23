"use client";

import Label from "@/components/Label/Label";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import Input from "@/shared/Input/Input";
import Textarea from "@/shared/Textarea/Textarea";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AccountPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        const preferences =
          data.preferences && typeof data.preferences === "object"
            ? (data.preferences as Record<string, string>)
            : {};
        setFullName(data.full_name || user.user_metadata?.full_name || "");
        setPhone(data.phone || "");
        setAddress(preferences.address || "");
        setAbout(preferences.bio || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (updateUserError) {
      setError(updateUserError.message);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      email,
      phone,
      preferences: {
        address,
        bio: about,
      },
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      setError(profileError.message);
    } else {
      setMessage("Cập nhật tài khoản thành công.");
      router.refresh();
    }

    setSaving(false);
  };

  if (loading) {
    return <div>Đang tải tài khoản...</div>;
  }

  return (
    <div className="nc-AccountPage">
      <div className="space-y-10 sm:space-y-12">
        <h2 className="text-2xl sm:text-3xl font-semibold">
          Thông tin tài khoản
        </h2>
        {message && <div className="rounded-2xl bg-green-50 px-5 py-4 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}
        <div className="flex flex-col md:flex-row">
          <div className="flex-shrink-0 flex items-start">
            <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 text-4xl font-semibold">
              {fullName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
            </div>
          </div>
          <div className="flex-grow mt-10 md:mt-0 md:pl-16 max-w-3xl space-y-6">
            <div>
              <Label>Họ và tên</Label>
              <Input className="mt-1.5" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1.5" value={email} disabled />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input className="mt-1.5" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div>
              <Label>Địa chỉ</Label>
              <Input className="mt-1.5" value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <div>
              <Label>Giới thiệu</Label>
              <Textarea className="mt-1.5" value={about} onChange={(event) => setAbout(event.target.value)} />
            </div>
            <div className="pt-2">
              <ButtonPrimary loading={saving} onClick={handleSave}>
                Cập nhật tài khoản
              </ButtonPrimary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
