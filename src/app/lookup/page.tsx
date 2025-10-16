"use client";

import { useEffect } from "react";
import { ReservationLookupProvider } from "@/features/reservations/context/reservation-lookup-context";
import { ReservationLookupForm } from "@/features/reservations/components/reservation-lookup-form";
import { useAppUiContext } from "@/features/app/context/app-ui-context";

export default function ReservationLookupPage() {
  const { setCurrentConcert } = useAppUiContext();

  useEffect(() => {
    setCurrentConcert(null);
  }, [setCurrentConcert]);

  return (
    <ReservationLookupProvider>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <ReservationLookupForm />
        </div>
      </main>
    </ReservationLookupProvider>
  );
}
