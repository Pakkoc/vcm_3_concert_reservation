"use client";

import { use } from "react";
import type { ReactNode } from "react";
import { ConcertDetailProvider } from "@/features/concerts/context/concert-detail-context";
import { ReservationSessionProvider } from "@/features/reservations/context/reservation-session-context";

type ConcertLayoutProps = {
  children: ReactNode;
  params: Promise<{ concertId: string }>;
};

export default function ConcertLayout({ children, params }: ConcertLayoutProps) {
  const { concertId } = use(params);

  return (
    <ConcertDetailProvider concertId={concertId}>
      <ReservationSessionProvider concertId={concertId}>
        {children}
      </ReservationSessionProvider>
    </ConcertDetailProvider>
  );
}
