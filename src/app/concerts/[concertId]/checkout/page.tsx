"use client";

import { use, useEffect } from "react";
import { useAppUiContext } from "@/features/app/context/app-ui-context";
import { ReservationCheckoutForm } from "@/features/reservations/components/reservation-checkout-form";
import { SelectedSeatSummary } from "@/features/reservations/components/selected-seat-summary";

type CheckoutPageProps = {
  params: Promise<{ concertId: string }>;
};

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { concertId } = use(params);
  const { setCurrentConcert } = useAppUiContext();

  useEffect(() => {
    setCurrentConcert(concertId);
    return () => setCurrentConcert(null);
  }, [concertId, setCurrentConcert]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16 lg:flex-row">
        <div className="flex-1">
          <ReservationCheckoutForm />
        </div>
        <div className="w-full lg:w-80">
          <SelectedSeatSummary concertId={concertId} showCheckoutCta={false} />
        </div>
      </div>
    </main>
  );
}
