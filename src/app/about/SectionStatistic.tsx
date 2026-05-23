import React, { FC } from "react";
import Heading from "@/components/Heading/Heading";

export interface Statistic {
  id: string;
  heading: string;
  subHeading: string;
}

const FOUNDER_DEMO: Statistic[] = [
  {
    id: "1",
    heading: "10.000+",
    subHeading:
      "Sáº£n pháº©m ná»™i tháº¥t Ä‘Ã£ Ä‘Æ°á»£c bÃ¡n ra toÃ n quá»‘c",
  },
  {
    id: "2",
    heading: "50.000+",
    subHeading: "KhÃ¡ch hÃ ng hÃ i lÃ²ng tin dÃ¹ng Furzose",
  },
  {
    id: "3",
    heading: "63",
    subHeading:
      "Tá»‰nh thÃ nh trÃªn toÃ n quá»‘c Ä‘Ã£ cÃ³ máº·t sáº£n pháº©m Furzose",
  },
];

export interface SectionStatisticProps {
  className?: string;
}

const SectionStatistic: FC<SectionStatisticProps> = ({ className = "" }) => {
  return (
    <div className={`nc-SectionStatistic relative ${className}`}>
      <Heading
        desc="Những con số nói lên sự phát triển vượt bậc của Furzose"
      >
        🚀 Con Số Nổi Bật
      </Heading>
      <div className="grid md:grid-cols-2 gap-6 lg:grid-cols-3 xl:gap-8">
        {FOUNDER_DEMO.map((item) => (
          <div
            key={item.id}
            className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-2xl dark:border-neutral-800"
          >
            <h3 className="text-2xl font-semibold leading-none text-neutral-900 md:text-3xl dark:text-neutral-200">
              {item.heading}
            </h3>
            <span className="block text-sm text-neutral-500 mt-3 sm:text-base dark:text-neutral-400">
              {item.subHeading}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionStatistic;


