"use client";

import GridMotion from "@/components/grid-motion";

export default function GridMotionBg({ className = "" }: { className?: string }) {
  const sources = [
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797415/WhatsApp_Image_2026-05-26_at_18.55.37_2_rasi1m.jpg",
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797513/WhatsApp_Image_2026-05-26_at_18.55.23_vbw0rz.jpg",
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797558/WhatsApp_Image_2026-05-26_at_18.55.20_me1ev4.jpg",
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797404/WhatsApp_Image_2026-05-26_at_18.55.37_p1omd8.jpg",
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797597/WhatsApp_Image_2026-05-26_at_18.55.23_1_r91zfu.jpg",
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797428/WhatsApp_Image_2026-05-26_at_18.55.37_1_zzrojs.jpg",
    "https://res.cloudinary.com/djusa1ywh/image/upload/v1779797541/WhatsApp_Image_2026-05-26_at_18.55.36_dzkp4f.jpg",
  ];
  const items = Array.from({ length: 28 }, (_, index) => sources[index % sources.length]);

  return (
    <div className={`w-full h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 ${className}`}>
      <GridMotion gradientColor="rgba(0, 0, 0, 0.7)" items={items} />
    </div>
  );
}
