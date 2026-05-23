import React from "react";
import ButtonPrimary from "@/shared/Button/ButtonPrimary";

const AccountBilling = () => {
  return (
    <div className="space-y-10 sm:space-y-12">
      {/* HEADING */}
      <h2 className="text-2xl sm:text-3xl font-semibold">Thanh toán & chi trả</h2>
      <div className="max-w-2xl prose prose-slate dark:prose-invert">
        <span className="">
          {`Khi bạn nhận được thanh toán cho một đơn hàng, chúng tôi gọi khoản thanh toán đó là "chi trả". Hệ thống thanh toán bảo mật của chúng tôi hỗ trợ nhiều phương thức chi trả khác nhau, có thể được thiết lập bên dưới.`}
          <br />
          <br />
          Để nhận tiền, bạn cần thiết lập phương thức chi trả. Thời gian xử lý khoảng 24 giờ. Thời gian để tiền xuất hiện trong tài khoản của bạn phụ thuộc vào phương thức chi trả bạn chọn.{` `}
          <a href="##">Tìm hiểu thêm</a>
        </span>
        <div className="pt-10">
          <ButtonPrimary>Thêm phương thức thanh toán</ButtonPrimary>
        </div>
      </div>
    </div>
  );
};

export default AccountBilling;
