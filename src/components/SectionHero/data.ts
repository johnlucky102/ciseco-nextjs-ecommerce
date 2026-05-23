import Image, { StaticImageData } from "next/image";
import { Route } from "@/routers/types";
import imageRightPng from "@/images/hero-right.png";
import imageRightPng2 from "@/images/hero-right-2.png";
import imageRightPng3 from "@/images/hero-right-3.png";

interface Hero2DataType {
  image: StaticImageData | string;
  heading: string;
  subHeading: string;
  btnText: string;
  btnLink: Route;
}

export const HERO2_DEMO_DATA: Hero2DataType[] = [
  {
    image: imageRightPng2,
    heading: "Bộ sưu tập nội thất cao cấp",
    subHeading: "Khám phá phòng khách đẹp mơ trong mùa này 🔥",
    btnText: "Khám phá ngay",
    btnLink: "/collection",
  },
  {
    image: imageRightPng3,
    heading: "Nội thất phòng ngủ tối giản",
    subHeading: "Giấc ngủ ngon hơn với thiết kế hiện đại ✨",
    btnText: "Xem ngay",
    btnLink: "/collection",
  },
  {
    image: imageRightPng,
    heading: "Phong cách sống hiện đại",
    subHeading: "Tạo không gian sống đẹp với nội thất Furzose 🏠",
    btnText: "Mua sắm ngay",
    btnLink: "/collection",
  },
];
