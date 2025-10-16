"use client";

import { FormEvent, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  ArrowRightCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReservationLookupContext } from "@/features/reservations/context/reservation-lookup-context";

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

export const ReservationLookupForm = () => {
  const { state, setPhone, setPin4, lookup } = useReservationLookupContext();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void lookup();
  };

  const hasResult = state.result && state.result.length > 0;

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">예약 조회</h1>
        <p className="text-sm text-slate-600">
          예약 시 입력한 휴대폰 번호와 비밀번호로 예약 내역을 확인하세요.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="space-y-2">
          <Label htmlFor="lookup-phone" className="text-slate-700">
            휴대폰 번호
          </Label>
          <Input
            id="lookup-phone"
            value={state.phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01012345678"
            inputMode="numeric"
            disabled={state.loading}
            className="h-11 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lookup-pin" className="text-slate-700">
            예약 비밀번호
          </Label>
          <Input
            id="lookup-pin"
            type="password"
            value={state.pin4}
            onChange={(event) => setPin4(event.target.value)}
            placeholder="숫자 4자리 비밀번호"
            disabled={state.loading}
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            className="h-11 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <Button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 text-base font-semibold text-emerald-950 hover:bg-emerald-400 disabled:bg-slate-200 disabled:text-slate-400"
          disabled={state.loading}
        >
          {state.loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              조회 중...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              예약 조회
            </>
          )}
        </Button>
      </form>

      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {hasResult && state.result && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            조회된 예약 {state.result.length}건
          </h2>
          <ul className="space-y-3">
            {state.result.map((reservation) => (
              <li
                key={reservation.reservationId}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      예약 번호 {reservation.reservationId}
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {reservation.concertTitle}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="secondary"
                    className="inline-flex items-center gap-2 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Link href={`/reservations/${reservation.reservationId}`}>
                      상세 보기
                      <ArrowRightCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    {formatDate(reservation.eventAt)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    {reservation.venue}
                  </span>
                  <span className="font-medium text-emerald-600">
                    {currencyFormatter.format(reservation.totalAmount)}
                  </span>
                </div>
                <SeatList
                  seats={reservation.seats.map((seat) => ({
                    id: seat.seatId,
                    label: `${seat.zone}-${seat.rowLabel}${seat.seatNumber}`,
                    grade: seat.gradeCode,
                  }))}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
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

type SeatListProps = {
  seats: {
    id: string;
    label: string;
    grade: string;
  }[];
};

const SeatList = ({ seats }: SeatListProps) => {
  const columns = useMemo(() => {
    return Math.min(Math.max(seats.length, 1), 4);
  }, [seats.length]);

  return (
    <div
      className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {seats.map((seat) => (
        <span
          key={seat.id}
          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
        >
          <span>{seat.label}</span>
          <span className="text-slate-500">{seat.grade}</span>
        </span>
      ))}
    </div>
  );
};
