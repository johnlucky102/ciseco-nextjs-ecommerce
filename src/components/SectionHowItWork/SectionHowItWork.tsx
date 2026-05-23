import React, { FC } from "react";
import NcImage from "@/shared/NcImage/NcImage";
import HIW1img from "@/images/HIW1img.png";
import HIW2img from "@/images/HIW2img.png";
import HIW3img from "@/images/HIW3img.png";
import HIW4img from "@/images/HIW4img.png";
import VectorImg from "@/images/VectorHIW.svg";
import Badge from "@/shared/Badge/Badge";
import Image from "next/image";

export interface SectionHowItWorkProps {
  className?: string;
  data?: typeof DEMO_DATA[0][];
}

const DEMO_DATA = [
  {
    id: 1,
    img: HIW1img,
    imgDark: HIW1img,
    title: "Lọc & Khám phá",
    desc: "Bộ lọc thông minh giúp bạn dễ dàng tìm được sản phẩm yêu thích",
  },
  {
    id: 2,
    img: HIW2img,
    imgDark: HIW2img,
    title: "Thêm vào giỏ",
    desc: "Chọn sản phẩm phù hợp và thêm vào giỏ hàng dễ dàng",
  },
  {
    id: 3,
    img: HIW3img,
    imgDark: HIW3img,
    title: "Giao hàng nhanh",
    desc: "Đơn vị vận chuyển xác nhận và giao tận nơi nhanh chóng",
  },
  {
    id: 4,
    img: HIW4img,
    imgDark: HIW4img,
    title: "Tận hưởng không gian",
    desc: "Trải nghiệm cuộc sống mới với nội thất chất lượng 5 sao",
  },
];

const SectionHowItWork: FC<SectionHowItWorkProps> = ({
  className = "",
  data = DEMO_DATA,
}) => {
  return (
    <div className={`nc-SectionHowItWork ${className}`}>
      <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-16 xl:gap-20">
        <Image
          className="hidden md:block absolute inset-x-0 top-5"
          src={VectorImg}
          alt="vector"
        />
        {data.map((item: typeof DEMO_DATA[number], index: number) => (
          <div
            key={item.id}
            className="relative flex flex-col items-center max-w-xs mx-auto"
          >
            <NcImage
              containerClassName="mb-4 sm:mb-10 max-w-[140px] mx-auto"
              className="rounded-3xl"
              src={item.img}
              sizes="150px"
              alt="HIW"
            />
            <div className="text-center mt-auto space-y-5">
              <Badge
                name={`B\u01b0\u1edbc ${index + 1}`}
                color={
                  !index
                    ? "red"
                    : index === 1
                    ? "indigo"
                    : index === 2
                    ? "yellow"
                    : "purple"
                }
              />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <span className="block text-slate-600 dark:text-slate-400 text-sm leading-6">
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionHowItWork;
