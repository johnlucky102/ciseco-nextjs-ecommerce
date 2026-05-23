import Label from "@/components/Label/Label";
import React from "react";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";
import Input from "@/shared/Input/Input";

const AccountPass = () => {
  return (
    <div className="space-y-10 sm:space-y-12">
      {/* HEADING */}
      <h2 className="text-2xl sm:text-3xl font-semibold">
        Cập nhật mật khẩu
      </h2>
      <div className=" max-w-xl space-y-6">
        <div>
          <Label>Mật khẩu hiện tại</Label>
          <Input type="password" className="mt-1.5" />
        </div>
        <div>
          <Label>Mật khẩu mới</Label>
          <Input type="password" className="mt-1.5" />
        </div>
        <div>
          <Label>Xác nhận mật khẩu</Label>
          <Input type="password" className="mt-1.5" />
        </div>
        <div className="pt-2">
          <ButtonPrimary>Cập nhật mật khẩu</ButtonPrimary>
        </div>
      </div>
    </div>
  );
};

export default AccountPass;
