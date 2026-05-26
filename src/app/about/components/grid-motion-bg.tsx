"use client";

import GridMotion from "@/components/grid-motion";

export default function GridMotionBg({ className = "" }: { className?: string }) {
  const items = Array.from({ length: 28 }, () => "/akres-logo-full.png?v=6");

  return (
    <div className={`w-full h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 ${className}`}>
      <GridMotion gradientColor="rgba(0, 0, 0, 0.7)" items={items} />
    </div>
  );
}
