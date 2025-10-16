"use client";

import { use, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useReservationSummaryQuery } from "@/features/reservations/hooks/useReservationSummaryQuery";
import { ReservationConfirmationCard } from "@/features/reservations/components/reservation-confirmation-card";
import { useAppUiContext } from "@/features/app/context/app-ui-context";

type ConfirmationPageProps = {
  params: Promise<{ reservationId: string }>;
};

export default function ReservationConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const { reservationId } = use(params);
  const summaryQuery = useReservationSummaryQuery(reservationId);
  const { setCurrentConcert } = useAppUiContext();

  useEffect(() => {
    if (summaryQuery.data) {
      setCurrentConcert(summaryQuery.data.concertId);
    }
    return () => setCurrentConcert(null);
  }, [setCurrentConcert, summaryQuery.data]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        {summaryQuery.isLoading && (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-slate-600 shadow-sm">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            예약 정보를 불러오는 중입니다...
          </div>
        )}
        {summaryQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {summaryQuery.error.message}
          </div>
        )}
        {summaryQuery.data && (
          <ReservationConfirmationCard summary={summaryQuery.data} />
        )}
      </div>
    </main>
  );
}
