"use client";

import { Calendar, MapPin, User, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import type { ReservationSummary } from "@/features/reservations/lib/dto";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

type ReservationDetailCardProps = {
  summary: ReservationSummary;
};

export const ReservationDetailCard = ({
  summary,
}: ReservationDetailCardProps) => {
  const eventAt = formatDate(summary.eventAt);
  const createdAt = formatDate(summary.createdAt);
  const totalAmount = currencyFormatter.format(summary.totalAmount);

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          예약 번호
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {summary.reservationId}
        </h1>
      </header>

      <dl className="grid gap-4 md:grid-cols-2">
        <DetailRow icon={<Calendar className="h-4 w-4" />} label="공연 일정">
          {eventAt}
        </DetailRow>
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="공연 장소">
          {summary.venue}
        </DetailRow>
        <DetailRow icon={<User className="h-4 w-4" />} label="예약자">
          {summary.reserverName} · {summary.maskedPhone}
        </DetailRow>
        <DetailRow icon={<Ticket className="h-4 w-4" />} label="예약 시각">
          {createdAt}
        </DetailRow>
      </dl>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">좌석 정보</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {summary.seats.map((seat) => (
            <li
              key={seat.seatId}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              <span>
                {seat.zone}-{seat.rowLabel}
                {seat.seatNumber} ({seat.gradeCode})
              </span>
              <span className="text-emerald-600">
                {currencyFormatter.format(seat.price)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
          <span>총 금액</span>
          <span className="text-emerald-600">{totalAmount}</span>
        </div>
      </div>
    </section>
  );
};

const formatDate = (iso: string) => {
  try {
    return dateFormatter.format(new Date(iso));
  } catch (error) {
    return iso;
  }
};

type DetailRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

const DetailRow = ({ icon, label, children }: DetailRowProps) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
    <span className="text-slate-500">{icon}</span>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{children}</p>
    </div>
  </div>
);
