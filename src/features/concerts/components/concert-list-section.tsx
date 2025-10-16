"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConcertListContext } from "@/features/concerts/context/concert-list-context";
import type { ConcertSummary } from "@/features/concerts/lib/dto";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const formatDate = (iso: string) => {
  try {
    return dateFormatter.format(new Date(iso));
  } catch (error) {
    return iso;
  }
};

const computeFillRate = (concert: ConcertSummary) => {
  if (concert.capacity === 0) {
    return 0;
  }
  return Math.min(
    100,
    Math.round((concert.appliedCount / concert.capacity) * 100),
  );
};

const sortLabels: Record<ConcertSummarySortKey, string> = {
  eventAt: "일자",
  title: "제목",
  venue: "장소",
};

type ConcertSummarySortKey = "eventAt" | "title" | "venue";

export const ConcertListSection = () => {
  const { filter, listQuery, setSortBy, setSortOrder } = useConcertListContext();
  const concerts = listQuery.data?.concerts ?? [];

  const sortedLabel = sortLabels[filter.sortBy];

  const sortOrderLabel = filter.sortOrder === "asc" ? "오름차순" : "내림차순";

  const emptyState = !listQuery.isLoading && concerts.length === 0;

  return (
    <section className="w-full space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">예약 가능 공연</h1>
          <p className="text-sm text-slate-500">
            원하는 콘서트를 선택하고 남은 좌석 현황을 확인한 뒤 바로 예약을 진행하세요.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            {(Object.keys(sortLabels) as ConcertSummarySortKey[]).map((key) => (
              <Button
                key={key}
                type="button"
                variant={filter.sortBy === key ? "default" : "secondary"}
                className="flex items-center gap-1 rounded-lg"
                onClick={() => setSortBy(key)}
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="text-sm">{sortLabels[key]}</span>
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
            onClick={() =>
              setSortOrder(filter.sortOrder === "asc" ? "desc" : "asc")
            }
          >
            {sortedLabel} · {sortOrderLabel}
          </Button>
        </div>
      </header>

      {listQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index.toString()}`}
              className="h-48 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      )}

      {listQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {listQuery.error.message}
        </div>
      )}

      {emptyState && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
          조건에 맞는 콘서트가 없습니다. 다른 정렬 옵션을 시도해보세요.
        </div>
      )}

      <AnimatePresence>
        <motion.div
          layout
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {concerts.map((concert) => (
            <ConcertListCard key={concert.id} concert={concert} />
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};

const ConcertListCard = ({ concert }: { concert: ConcertSummary }) => {
  const fillRate = useMemo(() => computeFillRate(concert), [concert]);
  const imageUrl = useMemo(() => {
    // valid picsum.photos placeholder with deterministic seed per concert
    return `https://picsum.photos/seed/${encodeURIComponent(concert.id)}/800/400`;
  }, [concert.id]);

  const appliedLabel = `${concert.appliedCount.toLocaleString()} / ${concert.capacity.toLocaleString()}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="relative mb-4 h-40 w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={concert.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{concert.title}</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(concert.eventAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="h-4 w-4" />
          <span>{concert.venue}</span>
        </div>
      </header>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4 text-slate-500" />
            신청 / 수용
          </span>
          <span className="font-medium text-slate-900">{appliedLabel}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${fillRate}%` }}
          />
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-6">
        <Link
          href={`/concerts/${concert.id}`}
          className="inline-flex items-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          상세 보기
        </Link>
      </div>
    </motion.article>
  );
};
