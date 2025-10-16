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

  const gradePriceMap = useMemo(() => {
    if (!detailQuery.data) {
      return new Map<string, number>();
    }
    return new Map(
      detailQuery.data.grades.map((grade) => [grade.gradeId, grade.price]),
    );
  }, [detailQuery.data]);

  // 구역별 등급 버킷으로 재구성하여, 등급별로 모든 구역의 좌석 개수가 동일하게 보이도록 정규화
  const zoneGradeBuckets = useMemo(() => {
    const seats = seatMapQuery.data?.seats ?? [];

    // zones: Map<zone, Map<gradeCode, SeatMapCell[]>>
    const zones = new Map<string, Map<string, SeatMapCell[]>>();
    const gradeOrderSet = new Set<string>();

    seats.forEach((seat) => {
      gradeOrderSet.add(seat.gradeCode);
      if (!zones.has(seat.zone)) zones.set(seat.zone, new Map());
      const gradeMap = zones.get(seat.zone)!;
      if (!gradeMap.has(seat.gradeCode)) gradeMap.set(seat.gradeCode, []);
      gradeMap.get(seat.gradeCode)!.push(seat);
    });

    // 정렬/정규화 기준: 등급 사전순(SPECIAL → PREMIUM → ADVANCED → REGULAR과 다를 수 있어 order 보정)
    const preferredOrder = ["SPECIAL", "PREMIUM", "ADVANCED", "REGULAR"] as const;
    const gradeOrder = preferredOrder.filter((g) => gradeOrderSet.has(g)).concat(
      Array.from(gradeOrderSet).filter((g) => !preferredOrder.includes(g as any)).sort(),
    );

    // 각 등급의 최대 좌석 수(모든 구역 중)
    const maxCountByGrade = gradeOrder.reduce<Record<string, number>>((acc, g) => {
      let max = 0;
      for (const [, gradeMap] of zones) {
        const count = (gradeMap.get(g)?.length ?? 0);
        if (count > max) max = count;
      }
      acc[g] = max;
      return acc;
    }, {});

    // 정규화된 구조 생성
    const zoneList = Array.from(zones.keys()).sort();
    const normalized = zoneList.map((zone) => {
      const gradeMap = zones.get(zone)!;
      const grades = gradeOrder.map((g) => {
        const list = (gradeMap.get(g) ?? []).sort((a, b) => a.seatNumber - b.seatNumber);
        const placeholders = Math.max(0, (maxCountByGrade[g] ?? 0) - list.length);
        return { gradeCode: g, seats: list, placeholders };
      });
      return { zone, grades };
    });

    return { gradeOrder, maxCountByGrade, zones: normalized };
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

      {!seatMapQuery.isLoading && !seatMapQuery.isError && zoneGradeBuckets.zones.length > 0 && (
        <div className="space-y-4">
          <div className="mx-auto mb-2 w-full max-w-lg rounded-md bg-slate-800 py-2 text-center text-xs font-medium text-white">
            STAGE
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {zoneGradeBuckets.zones.map((zone) => (
              <div
                key={zone.zone}
                className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <header className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{zone.zone} 구역</h3>
                  <span className="text-xs text-slate-500">{zone.grades.reduce((acc, g) => acc + g.seats.length, 0)}석</span>
                </header>

                {zone.grades.map((g) => {
                  const maxCount = Math.max(1, zoneGradeBuckets.maxCountByGrade[g.gradeCode] ?? g.seats.length);
                  const columns = Math.min(16, Math.max(6, Math.ceil(Math.sqrt(maxCount))));
                  const placeholders = Array.from({ length: g.placeholders });

                  return (
                    <div key={`${zone.zone}-${g.gradeCode}`} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className={clsx("text-xs font-semibold", gradeStyle.get(g.gradeCode)?.selectedText ?? "text-slate-700")}>{g.gradeCode}</span>
                        <span className="text-xs text-slate-500">{g.seats.length}석</span>
                      </div>
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                      >
                        {g.seats.map((seat) => {
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
                        {placeholders.map((_, idx) => (
                          <div key={`ph-${zone.zone}-${g.gradeCode}-${idx}`} className="h-8 w-full rounded-sm border border-transparent" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <div className="mb-2 font-semibold">좌석 안내</div>
            <ul className="flex flex-wrap gap-3">
              <li className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-fuchsia-400" /> SPECIAL</li>
              <li className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-amber-400" /> PREMIUM</li>
              <li className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-sky-400" /> ADVANCED</li>
              <li className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-emerald-400" /> REGULAR</li>
              <li className="ml-4 inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-100" /> 예약됨</li>
              <li className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-amber-200 bg-amber-50" /> 홀드중</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};
