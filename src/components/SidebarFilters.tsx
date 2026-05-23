"use client";

import React, { useState } from "react";
import Checkbox from "@/shared/Checkbox/Checkbox";
import Slider from "rc-slider";
import Radio from "@/shared/Radio/Radio";
import MySwitch from "@/components/MySwitch";

const DATA_categories = [
  { name: "Sofa & Ghế sofa" },
  { name: "Giường & Đầu giường" },
  { name: "Bàn ăn & Ghế ăn" },
  { name: "Tủ & Kệ" },
  { name: "Bàn làm việc" },
  { name: "Ghế văn phòng" },
];

const DATA_materials = [
  { name: "Gỗ sồi" },
  { name: "Gỗ óc chó" },
  { name: "Da thật" },
  { name: "Vải nỉ" },
  { name: "Kim loại" },
  { name: "Đá cẩm thạch" },
];

const DATA_rooms = [
  { name: "Phòng khách" },
  { name: "Phòng ngủ" },
  { name: "Phòng ăn" },
  { name: "Phòng làm việc" },
];

const DATA_sortOrderRadios = [
  { name: "Mới nhất", id: "newest" },
  { name: "Nổi bật", id: "featured" },
  { name: "Giá tăng dần", id: "price-asc" },
  { name: "Giá giảm dần", id: "price-desc" },
];

const PRICE_RANGE = [1000000, 50000000];
//
const SidebarFilters = () => {
  const [isOnSale, setIsIsOnSale] = useState(false);
  const [rangePrices, setRangePrices] = useState([1000000, 50000000]);
  const [categoriesState, setCategoriesState] = useState<string[]>([]);
  const [materialsState, setMaterialsState] = useState<string[]>([]);
  const [roomsState, setRoomsState] = useState<string[]>([]);
  const [sortOrderStates, setSortOrderStates] = useState<string>("");

  const handleChangeCategories = (checked: boolean, name: string) => {
    checked
      ? setCategoriesState([...categoriesState, name])
      : setCategoriesState(categoriesState.filter((i) => i !== name));
  };

  const handleChangeMaterials = (checked: boolean, name: string) => {
    checked
      ? setMaterialsState([...materialsState, name])
      : setMaterialsState(materialsState.filter((i) => i !== name));
  };

  const handleChangeRooms = (checked: boolean, name: string) => {
    checked
      ? setRoomsState([...roomsState, name])
      : setRoomsState(roomsState.filter((i) => i !== name));
  };

  //

  const renderTabsCategories = () => {
    return (
      <div className="relative flex flex-col pb-8 space-y-4">
        <h3 className="font-semibold mb-2.5">Danh mục</h3>
        {DATA_categories.map((item) => (
          <div key={item.name} className="">
            <Checkbox
              name={item.name}
              label={item.name}
              defaultChecked={categoriesState.includes(item.name)}
              sizeClassName="w-5 h-5"
              labelClassName="text-sm font-normal"
              onChange={(checked) => handleChangeCategories(checked, item.name)}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderTabsMaterials = () => {
    return (
      <div className="relative flex flex-col py-8 space-y-4">
        <h3 className="font-semibold mb-2.5">Chất liệu</h3>
        {DATA_materials.map((item) => (
          <div key={item.name} className="">
            <Checkbox
              sizeClassName="w-5 h-5"
              labelClassName="text-sm font-normal"
              name={item.name}
              label={item.name}
              defaultChecked={materialsState.includes(item.name)}
              onChange={(checked) => handleChangeMaterials(checked, item.name)}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderTabsRooms = () => {
    return (
      <div className="relative flex flex-col py-8 space-y-4">
        <h3 className="font-semibold mb-2.5">Không gian</h3>
        {DATA_rooms.map((item) => (
          <div key={item.name} className="">
            <Checkbox
              name={item.name}
              label={item.name}
              defaultChecked={roomsState.includes(item.name)}
              onChange={(checked) => handleChangeRooms(checked, item.name)}
              sizeClassName="w-5 h-5"
              labelClassName="text-sm font-normal"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderTabsPriceRage = () => {
    return (
      <div className="relative flex flex-col py-8 space-y-5 pr-3">
        <div className="space-y-5">
          <span className="font-semibold">Khoảng giá</span>
          <Slider
            range
            min={PRICE_RANGE[0]}
            max={PRICE_RANGE[1]}
            step={1}
            defaultValue={[rangePrices[0], rangePrices[1]]}
            allowCross={false}
            onChange={(_input: number | number[]) =>
              setRangePrices(_input as number[])
            }
          />
        </div>

        <div className="flex justify-between space-x-5">
          <div>
            <label
              htmlFor="minPrice"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Tối thiểu
            </label>
            <div className="mt-1 relative rounded-md">
              <input
                type="text"
                name="minPrice"
                disabled
                id="minPrice"
                className="block w-36 pr-4 pl-4 sm:text-sm border-neutral-200 dark:border-neutral-700 rounded-full bg-transparent"
                value={`${(rangePrices[0] / 1000000).toFixed(0)}M ₫`}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="maxPrice"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Tối đa
            </label>
            <div className="mt-1 relative rounded-md">
              <input
                type="text"
                disabled
                name="maxPrice"
                id="maxPrice"
                className="block w-36 pr-4 pl-4 sm:text-sm border-neutral-200 dark:border-neutral-700 rounded-full bg-transparent"
                value={`${(rangePrices[1] / 1000000).toFixed(0)}M ₫`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabsSortOrder = () => {
    return (
      <div className="relative flex flex-col py-8 space-y-4">
        <h3 className="font-semibold mb-2.5">Sắp xếp</h3>
        {DATA_sortOrderRadios.map((item) => (
          <Radio
            id={item.id}
            key={item.id}
            name="radioNameSort"
            label={item.name}
            defaultChecked={sortOrderStates === item.id}
            sizeClassName="w-5 h-5"
            onChange={setSortOrderStates}
            className="!text-sm"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {renderTabsCategories()}
      {renderTabsRooms()}
      {renderTabsMaterials()}
      {renderTabsPriceRage()}
      <div className="py-8 pr-2">
        <MySwitch
          label="Đang giảm giá"
          desc="Sản phẩm đang được ưu đãi"
          enabled={isOnSale}
          onChange={setIsIsOnSale}
        />
      </div>
      {renderTabsSortOrder()}
    </div>
  );
};

export default SidebarFilters;
