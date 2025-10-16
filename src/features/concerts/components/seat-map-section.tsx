"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { RotateCcw, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConcertDetailContext } from "@/features/concerts/context/concert-detail-context";
import { useReservationSessionContext } from "@/features/reservations/context/reservation-session-context";
import type { SeatMapCell } from "@/features/concerts/lib/dto";

type ZoneGroup = {
  zone: string;
  rows: {
    rowLabel: string;
    seats: SeatMapCell[];
  }[];
};

export const SeatMapSection = () => {
  const { detailQuery } = useConcertDetailContext();
  const {
    seatMapQuery,
    selectedSeats,
    selectionWarning,
    toggleSeat,
    clearSelection,
    refetchSeatMap,
  } = useReservationSessionContext();

  // 등급 색상(테두리/선택 배경/텍스트) – Tailwind 고정 클래스 매핑
  const gradeStyle = useMemo(() => {
    return new Map<string, { border: string; hoverBorder: string; selectedBg: string; selectedText: string }>([
      ["SPECIAL", { border: "border-fuchsia-400", hoverBorder: "hover:border-fuchsia-400", selectedBg: "bg-fuchsia-100", selectedText: "text-fuchsia-700" }],
      ["PREMIUM", { border: "border-amber-400", hoverBorder: "hover:border-amber-400", selectedBg: "bg-amber-100", selectedText: "text-amber-700" }],
      ["ADVANCED", { border: "border-sky-400", hoverBorder: "hover:border-sky-400", selectedBg: "bg-sky-100", selectedText: "text-sky-700" }],
      ["REGULAR", { border: "border-emerald-400", hoverBorder: "hover:border-emerald-400", selectedBg: "bg-emerald-100", selectedText: "text-emerald-700" }],
    ]);
  }, []);

  // 등급별 목표 좌석 수 요구 제거: 구역 내에서 등급을 섹션으로 나누지 않고 색으로만 구분

  const gradePriceMap = useMemo(() => {
    if (!detailQuery.data) {
      return new Map<string, number>();
    }
    return new Map(
      detailQuery.data.grades.map((grade) => [grade.gradeId, grade.price]),
    );
  }, [detailQuery.data]);

  // 구역 → 행(rowLabel) → 좌석으로 그룹핑(등급 섹션 없이 색상만으로 구분)
  const groupedByZone = useMemo(() => {
    const seats = seatMapQuery.data?.seats ?? [];
    const zones = new Map<string, Map<string, SeatMapCell[]>>();

    seats.forEach((seat) => {
      if (!zones.has(seat.zone)) zones.set(seat.zone, new Map());
      const rowMap = zones.get(seat.zone)!;
      if (!rowMap.has(seat.rowLabel)) rowMap.set(seat.rowLabel, []);
      rowMap.get(seat.rowLabel)!.push(seat);
    });

    return Array.from(zones.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map<ZoneGroup>(([zone, rows]) => ({
        zone,
        rows: Array.from(rows.entries())
          .sort(([ra], [rb]) => ra.localeCompare(rb))
          .map(([rowLabel, rowSeats]) => ({
            rowLabel,
            seats: rowSeats.sort((a, b) => a.seatNumber - b.seatNumber),
          })),
      }));
  }, [seatMapQuery.data]);

  const selectedSeatIds = useMemo(
    () => new Set(selectedSeats.map((seat) => seat.seatId)),
    [selectedSeats],
  );

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            좌석 배치도
          </h2>
          <p className="text-sm text-slate-600">
            좌석을 선택하면 임시로 홀드됩니다. 4석까지 선택할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
            onClick={() => refetchSeatMap()}
            disabled={seatMapQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4 animate-spin disabled:animate-none" />
            새로 고침
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100"
            onClick={() => void clearSelection()}
            disabled={selectedSeats.length === 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            선택 초기화
          </Button>
        </div>
      </header>

      {detailQuery.data && (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <div className="mb-2 font-semibold">등급별 가격 안내</div>
          <ul className="flex flex-wrap gap-3">
            {detailQuery.data.grades.map((g) => {
              const style = gradeStyle.get(g.gradeCode) ?? { border: "border-slate-300" };
              const price = g.price.toLocaleString();
              return (
                <li key={g.gradeId} className="inline-flex items-center gap-2">
                  <span className={clsx("h-3 w-3 rounded-sm border", style.border)} />
                  <span className="font-medium">{g.gradeCode}</span>
                  <span className="text-slate-500">₩{price}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selectionWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <Info className="h-5 w-5 text-amber-500" />
          <p>{selectionWarning}</p>
        </div>
      )}

      {seatMapQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`seat-skeleton-${index.toString()}`}
              className="h-72 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      )}

      {seatMapQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {seatMapQuery.error.message}
        </div>
      )}

      {!seatMapQuery.isLoading && !seatMapQuery.isError && groupedByZone.length > 0 && (
        <div className="space-y-4">
          <div className="mx-auto mb-2 w-full max-w-lg rounded-md bg-slate-800 py-2 text-center text-xs font-medium text-white">
            STAGE
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {groupedByZone.map((zone) => (
              <div
                key={zone.zone}
                className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <header className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{zone.zone} 구역</h3>
                  <span className="text-xs text-slate-500">{zone.rows.reduce((acc, r) => acc + r.seats.length, 0)}석</span>
                </header>

                <div className="space-y-2">
                  {zone.rows.map((row) => (
                    <div key={`${zone.zone}-${row.rowLabel}`} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Row {row.rowLabel}</div>
                      <div className="grid grid-cols-4 gap-1">
                        {row.seats.map((seat) => {
                          const isSelected = selectedSeatIds.has(seat.seatId);
                          const status = seat.status;
                          const disabled = (!isSelected && status !== "available") || seatMapQuery.isFetching;
                          const seatPrice = gradePriceMap.get(seat.gradeId) ?? 0;
                          const style = gradeStyle.get(seat.gradeCode);

                          return (
                            <button
                              key={seat.seatId}
                              type="button"
                              className={clsx(
                                "relative flex h-8 w-full items-center justify-center rounded-sm border text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                                isSelected && clsx(style?.selectedBg ?? "bg-emerald-100", style?.selectedText ?? "text-emerald-700", style?.border ?? "border-emerald-300", "shadow-sm"),
                                !isSelected && status === "available" && clsx(style?.border ?? "border-slate-300", "bg-white text-slate-600", style?.hoverBorder ?? "hover:border-emerald-300", "hover:bg-emerald-50 hover:text-emerald-700"),
                                status === "reserved" && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                                status === "held" && "cursor-wait border-amber-200 bg-amber-50 text-amber-700",
                              )}
                              disabled={disabled}
                              onClick={() => toggleSeat({ seat, price: seatPrice })}
                              title={`${seat.gradeCode} ${seat.rowLabel}${seat.seatNumber}`}
                            >
                              {seat.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <div className="mb-2 font-semibold">좌석 안내</div>
            <ul className="flex flex-wrap gap-4">
              <li className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-slate-300 bg-white" /> 예약가능</li>
              <li className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-emerald-300 bg-emerald-100" /> 선택됨</li>
              <li className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-slate-200 bg-slate-100" /> 예약됨</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};
