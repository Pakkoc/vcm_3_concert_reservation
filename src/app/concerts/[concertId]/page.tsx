"use client";

import { useEffect, use } from "react";
import { useAppUiContext } from "@/features/app/context/app-ui-context";
import { ConcertDetailSection } from "@/features/concerts/components/concert-detail-section";

type ConcertDetailPageProps = {
  params: Promise<{ concertId: string }>;
};

export default function ConcertDetailPage({ params }: ConcertDetailPageProps) {
  const { concertId } = use(params);
  const { setCurrentConcert } = useAppUiContext();

  useEffect(() => {
    setCurrentConcert(concertId);
    return () => {
      setCurrentConcert(null);
    };
  }, [concertId, setCurrentConcert]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <ConcertDetailSection concertId={concertId} />
      </div>
    </main>
  );
}
