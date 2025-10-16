import type { SupabaseClient } from "@supabase/supabase-js";
import { isBefore } from "date-fns";
import {
  failure,
  success,
  type ErrorResult,
  type HandlerResult,
} from "@/backend/http/response";
import {
  ConcertDetailSchema,
  ConcertIdSchema,
  ConcertListQuerySchema,
  ConcertListResponseSchema,
  SeatMapResponseSchema,
  type ConcertDetail,
  type ConcertListQueryInput,
  type ConcertListResponse,
  type ConcertSummary,
  type SeatMapCell,
  type SeatMapResponse,
} from "./schema";
import { concertErrorCodes } from "./error";

type ConcertRow = {
  id: string;
  title: string;
  event_at: string;
  venue: string;
  description?: string | null;
};

type SeatRow = {
  id: string;
  concert_id: string;
  grade_id: string;
  zone: string;
  row_label: string;
  seat_number: number;
};

type SeatGradeRow = {
  id: string;
  concert_id: string;
  grade_code: string;
  price_krw: number;
};

type SeatSnapshot = {
  seats: SeatRow[];
  reservedSeatIds: Set<string>;
  heldSeatIds: Set<string>;
};

type ReservationSeatJoinRow = {
  seat_id: string;
  seats?: {
    concert_id: string;
  } | null;
};

type SeatHoldJoinRow = {
  seat_id: string;
  expires_at: string;
  seats?: {
    concert_id: string;
  } | null;
};

const sortColumnMap: Record<ConcertListQueryInput["sortBy"], string> = {
  eventAt: "event_at",
  title: "title",
  venue: "venue",
};

const normalizeGradeName = (gradeCode: string) =>
  gradeCode
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const deriveAvailableCount = (
  total: number,
  reserved: number,
  held: number,
) => Math.max(total - reserved - held, 0);

const propagateError = <TData, TCode extends string, TDetails>(
  result: HandlerResult<TData, TCode, TDetails>,
): ErrorResult<TCode, TDetails> => {
  if (result.ok) {
    throw new Error("Attempted to propagate a successful result.");
  }

  const errorResult = result as ErrorResult<TCode, TDetails>;

  return failure<TCode, TDetails>(
    errorResult.status,
    errorResult.error.code,
    errorResult.error.message,
    errorResult.error.details,
  );
};

const collectSeatSnapshot = async (
  supabase: SupabaseClient,
  concertId: string,
): Promise<HandlerResult<SeatSnapshot, string>> => {
  const { data: seatsData, error: seatsError } = await supabase
    .from("seats")
    .select("id, concert_id, grade_id, zone, row_label, seat_number")
    .eq("concert_id", concertId);

  if (seatsError) {
    return failure(500, concertErrorCodes.seatsFetchFailed, seatsError.message);
  }

  const seatRows = (seatsData ?? []) as SeatRow[];

  if (seatRows.length === 0) {
    return success<SeatSnapshot>({
      seats: seatRows,
      reservedSeatIds: new Set<string>(),
      heldSeatIds: new Set<string>(),
    });
  }

  const nowIso = new Date().toISOString();

  const { data: reservationSeatRows, error: reservationSeatError } =
    await supabase
      .from("reservation_seats")
      .select("seat_id, seats!inner(concert_id)")
      .eq("seats.concert_id", concertId);

  if (reservationSeatError) {
    return failure(
      500,
      concertErrorCodes.fetchFailed,
      reservationSeatError.message,
    );
  }

  const { data: holdRows, error: holdError } = await supabase
    .from("seat_holds")
    .select("seat_id, expires_at, seats!inner(concert_id)")
    .eq("seats.concert_id", concertId)
    .gt("expires_at", nowIso);

  if (holdError) {
    return failure(500, concertErrorCodes.fetchFailed, holdError.message);
  }

  const reservedSeatIds = new Set(
    (reservationSeatRows ?? [])
      .map((row) => (row as ReservationSeatJoinRow).seat_id)
      .filter((seatId) => typeof seatId === "string" && seatId.length > 0),
  );

  const heldSeatIds = new Set(
    ((holdRows ?? []) as SeatHoldJoinRow[])
      .filter((row) => !isBefore(new Date(row.expires_at), new Date()))
      .map((row) => row.seat_id)
      .filter((seatId) => typeof seatId === "string" && seatId.length > 0),
  );

  return success<SeatSnapshot>({
    seats: seatRows,
    reservedSeatIds,
    heldSeatIds,
  });
};

const collectGradeSnapshot = async (
  supabase: SupabaseClient,
  concertId: string,
): Promise<HandlerResult<SeatGradeRow[], string>> => {
  const { data: gradeRows, error: gradeError } = await supabase
    .from("seat_grades")
    .select("id, concert_id, grade_code, price_krw")
    .eq("concert_id", concertId);

  if (gradeError) {
    return failure(500, concertErrorCodes.gradesFetchFailed, gradeError.message);
  }

  return success<SeatGradeRow[]>(gradeRows ? (gradeRows as SeatGradeRow[]) : []);
};

export const getConcertList = async (
  supabase: SupabaseClient,
  rawParams: unknown,
): Promise<HandlerResult<ConcertListResponse, string>> => {
  const paramsResult = ConcertListQuerySchema.safeParse(rawParams ?? {});

  if (!paramsResult.success) {
    return failure(
      400,
      concertErrorCodes.invalidParams,
      "잘못된 콘서트 목록 요청 파라미터입니다.",
      paramsResult.error.format(),
    );
  }

  const params = paramsResult.data;

  const { data: concertRows, error: concertError } = await supabase
    .from("concerts")
    .select("id, title, event_at, venue, description")
    .order(sortColumnMap[params.sortBy], {
      ascending: params.sortOrder === "asc",
    });

  if (concertError) {
    return failure(500, concertErrorCodes.fetchFailed, concertError.message);
  }

  const concerts = (concertRows ?? []) as ConcertRow[];

  if (concerts.length === 0) {
    return success({ concerts: [] });
  }

  const concertIds = concerts.map((row) => row.id);

  const { data: seatRows, error: seatFetchError } = await supabase
    .from("seats")
    .select("id, concert_id, grade_id")
    .in("concert_id", concertIds);

  if (seatFetchError) {
    return failure(500, concertErrorCodes.seatsFetchFailed, seatFetchError.message);
  }

  const seatList = (seatRows ?? []) as SeatRow[];
  const seatById = new Map(seatList.map((seat) => [seat.id, seat]));

  const reservedSeatIdsByConcert = new Map<string, number>();

  if (concertIds.length > 0) {
    const { data: reservationSeatRows, error: reservationSeatError } =
      await supabase
        .from("reservation_seats")
        .select("seat_id, seats!inner(concert_id)")
        .in("seats.concert_id", concertIds);

    if (reservationSeatError) {
      return failure(
        500,
        concertErrorCodes.fetchFailed,
        reservationSeatError.message,
      );
    }

    ((reservationSeatRows ?? []) as ReservationSeatJoinRow[]).forEach((row) => {
      const concertId =
        row.seats?.concert_id ?? seatById.get(row.seat_id)?.concert_id;

      if (!concertId) {
        return;
      }

      reservedSeatIdsByConcert.set(
        concertId,
        (reservedSeatIdsByConcert.get(concertId) ?? 0) + 1,
      );
    });
  }

  const capacityByConcert = seatList.reduce((acc, seat) => {
    acc.set(seat.concert_id, (acc.get(seat.concert_id) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  const result: ConcertSummary[] = concerts.map((concert) => ({
    id: concert.id,
    title: concert.title,
    eventAt: concert.event_at,
    venue: concert.venue,
    capacity: capacityByConcert.get(concert.id) ?? 0,
    appliedCount: reservedSeatIdsByConcert.get(concert.id) ?? 0,
  }));

  const parsed = ConcertListResponseSchema.safeParse({ concerts: result });

  if (!parsed.success) {
    return failure(500, concertErrorCodes.fetchFailed, "콘서트 목록 응답 변환 실패.");
  }

  return success(parsed.data);
};

export const getConcertDetail = async (
  supabase: SupabaseClient,
  rawConcertId: unknown,
): Promise<HandlerResult<ConcertDetail, string>> => {
  const parsedId = ConcertIdSchema.safeParse(rawConcertId);

  if (!parsedId.success) {
    return failure(
      400,
      concertErrorCodes.invalidParams,
      "잘못된 콘서트 식별자입니다.",
      parsedId.error.format(),
    );
  }

  const concertId = parsedId.data;

  const { data: concertRow, error: concertError } = await supabase
    .from("concerts")
    .select("id, title, description, event_at, venue")
    .eq("id", concertId)
    .maybeSingle();

  if (concertError) {
    return failure(500, concertErrorCodes.fetchFailed, concertError.message);
  }

  if (!concertRow) {
    return failure(404, concertErrorCodes.concertNotFound, "콘서트를 찾을 수 없습니다.");
  }

  const seatSnapshotResult = await collectSeatSnapshot(supabase, concertId);

  if (!seatSnapshotResult.ok) {
    return propagateError(seatSnapshotResult);
  }

  const gradeSnapshotResult = await collectGradeSnapshot(supabase, concertId);

  if (!gradeSnapshotResult.ok) {
    return propagateError(gradeSnapshotResult);
  }

  const { seats, reservedSeatIds, heldSeatIds } = seatSnapshotResult.data;
  const gradeRows = gradeSnapshotResult.data as SeatGradeRow[];

  const capacity = seats.length;

  const reservedCountByGrade = new Map<string, number>();
  const heldCountByGrade = new Map<string, number>();
  const totalCountByGrade = new Map<string, number>();

  seats.forEach((seat) => {
    totalCountByGrade.set(seat.grade_id, (totalCountByGrade.get(seat.grade_id) ?? 0) + 1);

    if (reservedSeatIds.has(seat.id)) {
      reservedCountByGrade.set(
        seat.grade_id,
        (reservedCountByGrade.get(seat.grade_id) ?? 0) + 1,
      );
    } else if (heldSeatIds.has(seat.id)) {
      heldCountByGrade.set(
        seat.grade_id,
        (heldCountByGrade.get(seat.grade_id) ?? 0) + 1,
      );
    }
  });

  const appliedCount = Array.from(reservedSeatIds).length;

  const grades = gradeRows.map((grade) => {
    const total = totalCountByGrade.get(grade.id) ?? 0;
    const reserved = reservedCountByGrade.get(grade.id) ?? 0;
    const held = heldCountByGrade.get(grade.id) ?? 0;

    return {
      gradeId: grade.id,
      gradeCode: grade.grade_code,
      gradeName: normalizeGradeName(grade.grade_code),
      price: grade.price_krw,
      total,
      reserved,
      held,
      available: deriveAvailableCount(total, reserved, held),
    };
  });

  const detail = {
    id: concertRow.id,
    title: concertRow.title,
    description: concertRow.description ?? "",
    eventAt: concertRow.event_at,
    venue: concertRow.venue,
    capacity,
    appliedCount,
    grades,
  } satisfies ConcertDetail;

  const parsedDetail = ConcertDetailSchema.safeParse(detail);

  if (!parsedDetail.success) {
    return failure(500, concertErrorCodes.fetchFailed, "콘서트 상세 응답 변환 실패.");
  }

  return success(parsedDetail.data);
};

export const getConcertSeatMap = async (
  supabase: SupabaseClient,
  rawConcertId: unknown,
): Promise<HandlerResult<SeatMapResponse, string>> => {
  const parsedId = ConcertIdSchema.safeParse(rawConcertId);

  if (!parsedId.success) {
    return failure(
      400,
      concertErrorCodes.invalidParams,
      "잘못된 콘서트 식별자입니다.",
      parsedId.error.format(),
    );
  }

  const concertId = parsedId.data;

  const seatSnapshotResult = await collectSeatSnapshot(supabase, concertId);

  if (!seatSnapshotResult.ok) {
    return propagateError(seatSnapshotResult);
  }

  const { seats, reservedSeatIds, heldSeatIds } = seatSnapshotResult.data;

  const { data: gradeRows, error: gradeError } = await supabase
    .from("seat_grades")
    .select("id, grade_code")
    .eq("concert_id", concertId);

  if (gradeError) {
    return failure(500, concertErrorCodes.gradesFetchFailed, gradeError.message);
  }

  const gradeCodeById = new Map<string, string>();
  (gradeRows ?? []).forEach((row) => {
    gradeCodeById.set(row.id, row.grade_code);
  });

  const seatMap: SeatMapCell[] = seats.map((seat) => {
    const gradeCode = gradeCodeById.get(seat.grade_id) ?? "";
    const status = reservedSeatIds.has(seat.id)
      ? "reserved"
      : heldSeatIds.has(seat.id)
        ? "held"
        : "available";

    return {
      seatId: seat.id,
      gradeId: seat.grade_id,
      gradeCode,
      zone: seat.zone,
      rowLabel: seat.row_label,
      seatNumber: seat.seat_number,
      status,
    } satisfies SeatMapCell;
  });

  const parsed = SeatMapResponseSchema.safeParse({
    concertId,
    seats: seatMap,
  });

  if (!parsed.success) {
    return failure(500, concertErrorCodes.fetchFailed, "좌석 맵 응답 변환 실패.");
  }

  return success(parsed.data);
};
