"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReservationSessionContext } from "@/features/reservations/context/reservation-session-context";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

type SelectedSeatSummaryProps = {
  concertId: string;
  showCheckoutCta?: boolean;
};

export const SelectedSeatSummary = ({
  concertId,
  showCheckoutCta = true,
}: SelectedSeatSummaryProps) => {
  const {
    selectedSeats,
    totalPrice,
    selectedCount,
    toggleSeat,
    seatMapQuery,
  } = useReservationSessionContext();

  const formattedTotal = currencyFormatter.format(totalPrice);

  const seatItems = useMemo(() => {
    return selectedSeats.map((seat) => ({
      id: seat.seatId,
      label: `${seat.zone}-${seat.rowLabel}${seat.seatNumber}`,
      gradeCode: seat.gradeCode,
      gradeId: seat.gradeId,
      zone: seat.zone,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      priceLabel: currencyFormatter.format(seat.price),
      priceValue: seat.price,
    }));
  }, [selectedSeats]);

  const isSeatMapLoading = seatMapQuery.isLoading || seatMapQuery.isFetching;

  return (
    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">선택한 좌석</h2>
        <span className="text-sm text-slate-600">{selectedCount}석</span>
      </header>

      {seatItems.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          좌석을 선택하면 목록에 표시됩니다.
        </p>
      )}

      {seatItems.length > 0 && (
        <ul className="space-y-3">
          {seatItems.map((seat) => (
            <li
              key={seat.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <div>
                <div className="font-semibold text-slate-900">{seat.label}</div>
                <div className="text-xs text-slate-500">{seat.gradeCode}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-emerald-600">
                  {seat.priceLabel}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-slate-400 hover:text-rose-500"
                  onClick={() => {
                    const seatCell =
                      seatMapQuery.data?.seats.find(
                        (item) => item.seatId === seat.id,
                      ) ?? {
                        seatId: seat.id,
                        gradeId: seat.gradeId,
                        gradeCode: seat.gradeCode,
                        zone: seat.zone,
                        rowLabel: seat.rowLabel,
                        seatNumber: seat.seatNumber,
                        status: "available" as const,
                      };
                    if (!seatCell) {
                      return;
                    }
                    void toggleSeat({
                      seat: seatCell,
                      price: seat.priceValue,
                    });
                  }}
                  disabled={isSeatMapLoading}
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>총 금액</span>
          <span className="text-base font-semibold text-emerald-600">
            {formattedTotal}
          </span>
        </div>
      </div>

      {showCheckoutCta && (
        <Button
          asChild
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 text-base font-semibold text-emerald-950 hover:bg-emerald-400 disabled:bg-slate-200 disabled:text-slate-400"
          disabled={selectedCount === 0}
        >
          <Link href={`/concerts/${concertId}/checkout`}>
            예약 정보 입력하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}

      {seatMapQuery.isFetching && (
        <p className="text-xs text-slate-500">최신 좌석 정보를 확인 중입니다...</p>
      )}
    </aside>
  );
};
