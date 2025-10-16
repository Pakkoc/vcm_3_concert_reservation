"use client";

import { ConcertListProvider } from "@/features/concerts/context/concert-list-context";
import { ConcertListSection } from "@/features/concerts/components/concert-list-section";

export default function Home() {
  return (
    <ConcertListProvider>
      <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <ConcertListSection />
        </div>
      </main>
    </ConcertListProvider>
  );
}
