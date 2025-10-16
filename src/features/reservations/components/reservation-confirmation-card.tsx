"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Calendar, MapPin, TicketCheck, Phone, Clock } from "lucide-react";
import type { ReservationSummary } from "@/features/reservations/lib/dto";
import { Button } from "@/components/ui/button";

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

type ReservationConfirmationCardProps = {
  summary: ReservationSummary;
};

export const ReservationConfirmationCard = ({
  summary,
}: ReservationConfirmationCardProps) => {
  const eventAt = formatDate(summary.eventAt);
  const createdAt = formatDate(summary.createdAt);
  const totalAmount = currencyFormatter.format(summary.totalAmount);

  return (
    <section className="space-y-6 rounded-xl border border-emerald-200 bg-emerald-50 p-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1 text-xs uppercase tracking-wide text-emerald-600">
          <TicketCheck className="h-3.5 w-3.5" />
          예약 완료
        </div>
        <h1 className="text-3xl font-semibold text-emerald-800">
          예약 번호 {summary.reservationId}
        </h1>
        <p className="text-sm text-emerald-700">
          예약 정보는 아래에서 확인할 수 있습니다. 예약 조회 메뉴에서 전화번호와 비밀번호로 다시 확인할 수 있습니다.
        </p>
      </header>

      <dl className="grid gap-4 md:grid-cols-2">
        <InfoRow icon={<Calendar className="h-4 w-4" />} label="공연 일정">
          {eventAt}
        </InfoRow>
        <InfoRow icon={<MapPin className="h-4 w-4" />} label="공연 장소">
          {summary.venue}
        </InfoRow>
        <InfoRow icon={<Phone className="h-4 w-4" />} label="예약자/연락처">
          {summary.reserverName} · {summary.maskedPhone}
        </InfoRow>
        <InfoRow icon={<Clock className="h-4 w-4" />} label="예약 시각">
          {createdAt}
        </InfoRow>
      </dl>

      <div className="rounded-xl border border-emerald-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-emerald-800">좌석 정보</h2>
        <ul className="mt-3 space-y-2 text-sm text-emerald-700">
          {summary.seats.map((seat) => (
            <li
              key={seat.seatId}
              className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2"
            >
              <span>
                {seat.zone}-{seat.rowLabel}
                {seat.seatNumber} ({seat.gradeCode})
              </span>
              <span className="font-medium">
                {currencyFormatter.format(seat.price)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between text-base font-semibold text-emerald-800">
          <span>총 결제 금액</span>
          <span>{totalAmount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <Button
          asChild
          variant="outline"
          className="rounded-lg border-emerald-200 bg-transparent text-emerald-700 hover:bg-emerald-50"
        >
          <Link href={`/reservations/${summary.reservationId}`}>
            예약 상세 보기
          </Link>
        </Button>
        <Button
          asChild
          className="rounded-lg bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
        >
          <Link href="/lookup">예약 조회 바로가기</Link>
        </Button>
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

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

const InfoRow = ({ icon, label, children }: InfoRowProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-white p-4">
      <span className="text-emerald-500">{icon}</span>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-emerald-600">
          {label}
        </p>
        <p className="text-sm font-medium text-emerald-800">{children}</p>
      </div>
    </div>
  );
};
