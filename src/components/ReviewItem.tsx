import { StarIcon } from "@heroicons/react/24/solid";
import React, { FC } from "react";
import Avatar from "@/shared/Avatar/Avatar";

interface ReviewItemDataType {
  name: string;
  avatar?: string;
  date: string;
  comment: string;
  starPoint: number;
}

export interface ReviewItemProps {
  className?: string;
  data?: ReviewItemDataType;
}

const DEMO_DATA: ReviewItemDataType = {
  name: "Nguyễn Văn An",
  date: "20 Tháng 5, 2024",
  comment:
    "Sản phẩm rất đẹp và chất lượng tốt. Gia đình tôi rất hài lòng với chiếc ghế sofa này, thiết kế hiện đại và phù hợp với không gian phòng khách nhà tôi.",
  starPoint: 5,
};

const ReviewItem: FC<ReviewItemProps> = ({
  className = "",
  data = DEMO_DATA,
}) => {
  return (
    <div
      className={`nc-ReviewItem flex flex-col ${className}`}
      data-nc-id="ReviewItem"
    >
      <div className=" flex space-x-4 ">
        <div className="flex-shrink-0 pt-0.5">
          <Avatar
            sizeClass="h-10 w-10 text-lg"
            radius="rounded-full"
            userName={data.name}
            imgUrl={data.avatar}
          />
        </div>

        <div className="flex-1 flex justify-between">
          <div className="text-sm sm:text-base">
            <span className="block font-semibold">{data.name}</span>
            <span className="block mt-0.5 text-slate-500 dark:text-slate-400 text-sm">
              {data.date}
            </span>
          </div>

          <div className="mt-0.5 flex text-yellow-500">
            <StarIcon className="w-5 h-5" />
            <StarIcon className="w-5 h-5" />
            <StarIcon className="w-5 h-5" />
            <StarIcon className="w-5 h-5" />
            <StarIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
      <div className="mt-4 prose prose-sm sm:prose dark:prose-invert sm:max-w-2xl">
        <p className="text-slate-600 dark:text-slate-300">{data.comment}</p>
      </div>
    </div>
  );
};

export default ReviewItem;
