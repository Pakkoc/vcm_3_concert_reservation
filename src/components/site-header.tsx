"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-sm text-slate-700 hover:bg-slate-100">
            <Link href="/lookup" aria-label="예약 조회 페이지로 이동">예약 조회</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
