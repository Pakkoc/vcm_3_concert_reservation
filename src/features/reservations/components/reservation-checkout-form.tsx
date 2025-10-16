"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReservationSessionContext } from "@/features/reservations/context/reservation-session-context";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export const ReservationCheckoutForm = () => {
  const router = useRouter();
  const {
    form,
    setName,
    setPhone,
    setPin4,
    selectedSeats,
    totalPrice,
    selectionWarning,
    setSelectionWarning,
    submitReservation,
    submitState,
    canSubmit,
  } = useReservationSessionContext();
  const [isRouting, startRouteTransition] = useTransition();

  const selectedSeatLabel = useMemo(() => {
    return selectedSeats
      .map(
        (seat) =>
          `${seat.zone}-${seat.rowLabel}${seat.seatNumber} (${seat.gradeCode})`,
      )
      .join(", ");
  }, [selectedSeats]);

  const totalLabel = currencyFormatter.format(totalPrice);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const summary = await submitReservation();

    if (!summary) {
      return;
    }

    startRouteTransition(() => {
      router.push(`/reservations/${summary.reservationId}/confirmation`);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          예약자 정보 입력
        </h2>
        <p className="text-sm text-slate-600">
          선택한 좌석과 예약자 정보를 확인한 뒤 예약을 완료하세요.
        </p>
      </header>

      {selectionWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <div className="space-y-2">
            <p>{selectionWarning}</p>
            <button
              type="button"
              className="text-xs text-amber-600 underline"
              onClick={() => setSelectionWarning(null)}
            >
              알림 닫기
            </button>
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>선택 좌석</span>
          <span className="font-medium text-emerald-600">
            {selectedSeats.length}석
          </span>
        </div>
        <p className="text-xs text-slate-500">{selectedSeatLabel || "선택된 좌석이 없습니다."}</p>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>총 금액</span>
          <span className="text-emerald-600">{totalLabel}</span>
        </div>
      </section>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reserver-name" className="text-slate-700">
            예약자 이름
          </Label>
          <Input
            id="reserver-name"
            value={form.reserverName}
            onChange={(event) => setName(event.target.value)}
            placeholder="홍길동"
            className="h-11 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          />
          {form.errors.reserverName && (
            <p className="text-xs text-rose-600">{form.errors.reserverName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reserver-phone" className="text-slate-700">
            휴대폰 번호
          </Label>
          <Input
            id="reserver-phone"
            value={form.phoneNumber}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01012345678"
            inputMode="numeric"
            className="h-11 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          />
          {form.errors.phoneNumber && (
            <p className="text-xs text-rose-600">{form.errors.phoneNumber}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservation-pin" className="text-slate-700">
            예약 비밀번호
          </Label>
          <Input
            id="reservation-pin"
            type="password"
            value={form.pin4}
            onChange={(event) => setPin4(event.target.value)}
            placeholder="숫자 4자리 비밀번호"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            className="h-11 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          />
          {form.errors.pin4 && (
            <p className="text-xs text-rose-600">{form.errors.pin4}</p>
          )}
        </div>
      </div>

      {submitState.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitState.error}
        </div>
      )}

      <Button
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 text-base font-semibold text-emerald-950 hover:bg-emerald-400 disabled:bg-slate-200 disabled:text-slate-400"
        disabled={!canSubmit || submitState.submitting || isRouting}
      >
        {submitState.submitting || isRouting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            예약 처리 중...
          </>
        ) : (
          "예약 완료하기"
        )}
      </Button>
    </form>
  );
};
