"use client";

import Link from "next/link";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-900 transition hover:text-emerald-600"
          aria-label="MaFia Reservation 홈으로 이동"
        >
          MaFia Reservation
        </Link>
      </div>
    </header>
  );
};
