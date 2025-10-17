"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bookmark,
  MapPin,
  CalendarRange,
  Users,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConcertDetailContext } from "@/features/concerts/context/concert-detail-context";
import type { SeatGradeSummary } from "@/features/concerts/lib/dto";

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

const formatDate = (iso: string) => {
  try {
    return dateFormatter.format(new Date(iso));
  } catch (error) {
    return iso;
  }
};

const formatPrice = (price: number) => currencyFormatter.format(price);

const getGradeBarClass = (gradeCode: string) => {
  const map: Record<string, string> = {
    SPECIAL: "bg-fuchsia-500",
    PREMIUM: "bg-amber-500",
    ADVANCED: "bg-sky-500",
    REGULAR: "bg-emerald-500",
  };
  return map[gradeCode] ?? "bg-slate-400";
};

export const ConcertDetailSection = ({ concertId }: { concertId: string }) => {
  const { detailQuery } = useConcertDetailContext();

  if (detailQuery.isLoading) {
    return (
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded bg-slate-200" />
      </section>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {detailQuery.error?.message ?? "콘서트 정보를 불러오는 중 문제가 발생했습니다."}
      </section>
    );
  }

  const detail = detailQuery.data;
  const appliedLabel = `${detail.appliedCount.toLocaleString()} / ${detail.capacity.toLocaleString()}`;

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs uppercase tracking-wide text-emerald-700">
          <Bookmark className="h-3.5 w-3.5" />
          콘서트 상세 정보
        </div>
        <h1 className="text-3xl font-semibold text-slate-900">{detail.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-slate-500" />
            {formatDate(detail.eventAt)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            {detail.venue}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            신청 / 수용 {appliedLabel}
          </span>
        </div>
      </header>

      {detail.description && detail.description.trim().length > 0 && (
        <p className="text-sm leading-relaxed text-slate-600">
          {detail.description}
        </p>
      )}

      <SeatGradesOverview grades={detail.grades} />

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            좌석 선택으로 이동
          </h2>
          <p className="text-sm text-slate-600">
            원하는 좌석을 선택하고 예약 정보를 입력하여 예약을 완료하세요.
          </p>
        </div>
        <Button
          asChild
          className="h-12 rounded-lg bg-emerald-500 px-6 text-base font-semibold text-emerald-950 hover:bg-emerald-400"
        >
          <Link href={`/concerts/${concertId}/seats`}>좌석 선택하기</Link>
        </Button>
      </div>
    </section>
  );
};

const SeatGradesOverview = ({ grades }: { grades: SeatGradeSummary[] }) => {
  const sortedGrades = useMemo(() => {
    return [...grades].sort((a, b) => a.price - b.price);
  }, [grades]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-inner">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900">등급별 좌석 현황</h2>
        </div>
        <span className="text-xs text-slate-500">
          잔여 / 전체 좌석 기준
        </span>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {sortedGrades.map((grade) => {
          const remainingLabel = `${grade.available.toLocaleString()} / ${grade.total.toLocaleString()}`;
          const heldLabel = grade.held > 0 ? ` · 홀드 ${grade.held.toLocaleString()}` : "";
          return (
            <div
              key={grade.gradeId}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">
                  {grade.gradeName}
                </p>
                <span className="text-sm font-medium text-emerald-600">
                  {formatPrice(grade.price)}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                남은 좌석 {remainingLabel}
                {heldLabel}
              </p>
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${getGradeBarClass(grade.gradeCode)}`}
                  style={{
                    width:
                      grade.total === 0
                        ? "0%"
                        : `${Math.min(
                            100,
                            Math.round((grade.available / grade.total) * 100),
                          )}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
