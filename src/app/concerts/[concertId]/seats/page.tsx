"use client";

import { use, useEffect } from "react";
import { SeatMapSection } from "@/features/concerts/components/seat-map-section";
import { SelectedSeatSummary } from "@/features/reservations/components/selected-seat-summary";
import { useAppUiContext } from "@/features/app/context/app-ui-context";

type SeatSelectionPageProps = {
  params: Promise<{ concertId: string }>;
};

export default function SeatSelectionPage({ params }: SeatSelectionPageProps) {
  const { concertId } = use(params);
  const { setCurrentConcert } = useAppUiContext();

  useEffect(() => {
    setCurrentConcert(concertId);
    return () => setCurrentConcert(null);
  }, [concertId, setCurrentConcert]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 lg:flex-row">
        <div className="flex-1">
          <SeatMapSection />
        </div>
        <div className="w-full lg:w-80">
          <SelectedSeatSummary concertId={concertId} />
        </div>
      </div>
    </main>
  );
}
