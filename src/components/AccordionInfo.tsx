"use client";

import { Disclosure } from "@/app/headlessui";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { FC } from "react";

const DEMO_DATA = [
  {
    name: "Mô tả",
    content:
      "Nội thất Furzose được thiết kế tinh tế, kết hợp giữa thẩm mỹ hiện đại và tính bền vững cao, mang lại không gian sống thoải mái và đẳng cấp cho mọi ngôi nhà.",
  },
  {
    name: "Chất liệu & Bảo quản",
    content: `<ul class="list-disc list-inside leading-7">
    <li>Chất liệu gỗ sồi tự nhiên, bền đẹp theo thời gian.</li>
    <li>Lớp phủ bề mặt chống trầy xước và chống thấm ẩm.</li>
    <li>Làm sạch bằng khăn khô hoặc vải ẩm mềm.</li>
    <li>Tránh để tiếp xúc trực tiếp với ánh nắng mặt trời kéo dài.</li>
  </ul>`,
  },

  {
    name: "Kích thước",
    content:
      "Vui lòng tham khảo bảng kích thước sản phẩm trước khi đặt hàng. Liên hệ chúng tôi nếu bạn cần tư vấn về kích thước phù hợp với không gian nhà bạn.",
  },
  {
    name: "Câu hỏi thường gặp",
    content: `
    <ul class="list-disc list-inside leading-7">
    <li>Sản phẩm ngược hàng trong vòng 30 ngày nếu còn nguyên tem mác và đóng gói ban đầu.</li>
    <li>Chúng tôi hỗ trợ đổi trả miễn phí nếu sản phẩm bị lỗi sản xuất.</li>
    <li>Xem chính sách đổi trả đầy đủ tại trang chính sách của chúng tôi.</li>
    <li>Liên hệ hỗ trợ: support@furzose.vn</li>
  </ul>
    `,
  },
];

interface Props {
  panelClassName?: string;
  data?: typeof DEMO_DATA;
}

const AccordionInfo: FC<Props> = ({
  panelClassName = "p-4 pt-3 last:pb-0 text-slate-600 text-sm dark:text-slate-300 leading-6",
  data = DEMO_DATA,
}) => {
  return (
    <div className="w-full rounded-2xl space-y-2.5">
      {/* ============ */}
      {data.map((item, index) => {
        return (
          <Disclosure key={index} defaultOpen={index < 2}>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex items-center justify-between w-full px-4 py-2 font-medium text-left bg-slate-100/80 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg focus:outline-none focus-visible:ring focus-visible:ring-slate-500 focus-visible:ring-opacity-75 ">
                  <span>{item.name}</span>
                  {!open ? (
                    <PlusIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <MinusIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  )}
                </Disclosure.Button>
                <Disclosure.Panel
                  className={panelClassName}
                  as="div"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                ></Disclosure.Panel>
              </>
            )}
          </Disclosure>
        );
      })}

      {/* ============ */}
    </div>
  );
};

export default AccordionInfo;
