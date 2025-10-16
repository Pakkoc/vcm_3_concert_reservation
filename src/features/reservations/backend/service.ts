import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type ErrorResult,
  type HandlerResult,
} from "@/backend/http/response";
import {
  CreateReservationInputSchema,
  CreateReservationResponseSchema,
  ReservationIdSchema,
  ReservationLookupInputSchema,
  ReservationLookupResponseSchema,
  type CreateReservationResponse,
  type ReservationLookupResponse,
  type ReservationSeatSelection,
  type ReservationSummary,
} from "./schema";
import { reservationErrorCodes } from "./error";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const normalizePhoneNumber = (input: string) => input.replace(/[^0-9]/g, "");

const maskPhoneNumber = (phone: string) => {
  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};

const hashPassword = (plain: string) => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 32).toString("hex");
  return `${salt}:${derived}`;
};

const verifyPassword = (plain: string, hashed: string) => {
  const [salt, stored] = hashed.split(":");

  if (!salt || !stored) {
    return false;
  }

  const derived = scryptSync(plain, salt, 32).toString("hex");

  try {
    return timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(derived, "hex"));
  } catch (error) {
    return false;
  }
};

type ConcertRow = {
  id: string;
  title: string;
  event_at: string;
  venue: string;
};

type SeatWithGradeRow = {
  id: string;
  concert_id: string;
  grade_id: string;
  zone: string;
  row_label: string;
  seat_number: number;
  seat_grades: {
    id: string;
    grade_code: string;
    price_krw: number;
  } | null;
};

type ReservationRow = {
  id: string;
  reserver_name: string;
  phone_number: string;
  password_hash: string;
  total_amount: number;
  created_at: string;
};

type ReservationSeatJoinRow = {
  reservation_id: string;
  seats: SeatWithGradeRow;
};

type SeatGradeInfo = {
  id: string;
  grade_code: string;
  price_krw: number;
};

type RawSeatWithGrade = {
  id: string;
  concert_id: string;
  grade_id: string;
  zone: string;
  row_label: string;
  seat_number: number;
  seat_grades?: SeatGradeInfo | SeatGradeInfo[] | null;
};

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

const buildReservationSummary = (
  reservation: ReservationRow,
  concert: ConcertRow,
  seats: SeatWithGradeRow[],
): ReservationSummary => {
  const seatDetails = seats.map((seat) => {
    const grade = seat.seat_grades;

    return {
      seatId: seat.id,
      zone: seat.zone,
      rowLabel: seat.row_label,
      seatNumber: seat.seat_number,
      gradeId: grade?.id ?? seat.grade_id,
      gradeCode: grade?.grade_code ?? "",
      price: grade?.price_krw ?? 0,
    };
  });

  return {
    reservationId: reservation.id,
    concertId: concert.id,
    concertTitle: concert.title,
    eventAt: concert.event_at,
    venue: concert.venue,
    reserverName: reservation.reserver_name,
    maskedPhone: maskPhoneNumber(reservation.phone_number),
    seats: seatDetails,
    totalAmount: reservation.total_amount,
    createdAt: reservation.created_at,
  } satisfies ReservationSummary;
};

const loadSeatsWithGrades = async (
  supabase: SupabaseClient,
  seatIds: string[],
): Promise<HandlerResult<SeatWithGradeRow[], string>> => {
  const { data, error } = await supabase
    .from("seats")
    .select(
      "id, concert_id, grade_id, zone, row_label, seat_number, seat_grades(id, grade_code, price_krw)",
    )
    .in("id", seatIds);

  if (error) {
    return failure(500, reservationErrorCodes.creationFailed, error.message);
  }

  const rows = (data ?? []).map((row) => toSeatWithGrade(row as RawSeatWithGrade));

  return success<SeatWithGradeRow[]>(rows);
};

const confirmSeatAvailability = async (
  supabase: SupabaseClient,
  seatIds: string[],
): Promise<HandlerResult<null, string>> => {
  const { data, error } = await supabase
    .from("reservation_seats")
    .select("seat_id")
    .in("seat_id", seatIds);

  if (error) {
    return failure(500, reservationErrorCodes.creationFailed, error.message);
  }

  if ((data ?? []).length > 0) {
    const conflictedSeat = data?.[0]?.seat_id ?? seatIds[0];
    return failure(
      409,
      reservationErrorCodes.seatConflict,
      `이미 예약된 좌석이 포함되어 있습니다. 좌석 ID: ${conflictedSeat}`,
    );
  }

  return success<null>(null);
};

const validateSeatHolds = async (
  supabase: SupabaseClient,
  selections: ReservationSeatSelection[],
): Promise<
  HandlerResult<
    {
      holdTokens: string[];
    },
    string
  >
> => {
  const seatIds = selections.map((selection) => selection.seatId);
  const { data, error } = await supabase
    .from("seat_holds")
    .select("seat_id, hold_token, expires_at")
    .in("seat_id", seatIds);

  if (error) {
    return failure(500, reservationErrorCodes.creationFailed, error.message);
  }

  const now = new Date();
  const holdBySeat = new Map((data ?? []).map((row) => [row.seat_id, row]));

  for (const selection of selections) {
    const holdRow = holdBySeat.get(selection.seatId);

    if (!holdRow) {
      return failure(409, reservationErrorCodes.holdMissing, "선택한 좌석의 홀드가 존재하지 않습니다.");
    }

    if (holdRow.hold_token !== selection.holdToken) {
      return failure(409, reservationErrorCodes.holdMismatch, "홀드 토큰이 일치하지 않습니다.");
    }

    if (new Date(holdRow.expires_at) <= now) {
      return failure(409, reservationErrorCodes.holdExpired, "홀드가 만료되었습니다.");
    }
  }

  return success<{
    holdTokens: string[];
  }>({
    holdTokens: selections.map((selection) => selection.holdToken),
  });
};

const toSeatWithGrade = (raw: RawSeatWithGrade): SeatWithGradeRow => {
  const grade = Array.isArray(raw.seat_grades)
    ? raw.seat_grades[0] ?? null
    : raw.seat_grades ?? null;

  return {
    id: raw.id,
    concert_id: raw.concert_id,
    grade_id: raw.grade_id,
    zone: raw.zone,
    row_label: raw.row_label,
    seat_number: raw.seat_number,
    seat_grades: grade
      ? {
          id: grade.id,
          grade_code: grade.grade_code,
          price_krw: grade.price_krw,
        }
      : null,
  };
};

const fetchConcert = async (
  supabase: SupabaseClient,
  concertId: string,
): Promise<HandlerResult<ConcertRow, string>> => {
  const { data, error } = await supabase
    .from("concerts")
    .select("id, title, event_at, venue")
    .eq("id", concertId)
    .maybeSingle();

  if (error) {
    return failure(500, reservationErrorCodes.creationFailed, error.message);
  }

  if (!data) {
    return failure(404, reservationErrorCodes.concertNotFound, "콘서트를 찾을 수 없습니다.");
  }

  return success<ConcertRow>(data as ConcertRow);
};

export const createReservation = async (
  supabase: SupabaseClient,
  payload: unknown,
): Promise<HandlerResult<CreateReservationResponse, string>> => {
  const parsed = CreateReservationInputSchema.safeParse(payload);

  if (!parsed.success) {
    return failure(
      400,
      reservationErrorCodes.invalidPayload,
      "예약 요청 본문이 유효하지 않습니다.",
      parsed.error.format(),
    );
  }

  const input = parsed.data;
  const seatIds = input.selections.map((selection) => selection.seatId);

  const concertResult = await fetchConcert(supabase, input.concertId);

  if (!concertResult.ok) {
    return propagateError(concertResult);
  }

  const seatsResult = await loadSeatsWithGrades(supabase, seatIds);

  if (!seatsResult.ok) {
    return propagateError(seatsResult);
  }

  const seats = seatsResult.data;

  if (seats.length !== seatIds.length) {
    return failure(404, reservationErrorCodes.seatNotFound, "선택한 좌석 중 일부를 찾을 수 없습니다.");
  }

  const invalidSeat = seats.find((seat) => seat.concert_id !== input.concertId);

  if (invalidSeat) {
    return failure(
      400,
      reservationErrorCodes.invalidPayload,
      "선택한 좌석이 해당 콘서트에 속하지 않습니다.",
    );
  }

  const availabilityResult = await confirmSeatAvailability(supabase, seatIds);

  if (!availabilityResult.ok) {
    return propagateError(availabilityResult);
  }

  const holdValidationResult = await validateSeatHolds(supabase, input.selections);

  if (!holdValidationResult.ok) {
    return propagateError(holdValidationResult);
  }

  const totalAmount = seats.reduce((sum, seat) => {
    const price = seat.seat_grades?.price_krw ?? 0;
    return sum + price;
  }, 0);

  const reservationId = randomUUID();
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const passwordHash = hashPassword(input.password);

  const { data: reservationInsertData, error: reservationInsertError } =
    await supabase
      .from("reservations")
      .insert({
        id: reservationId,
        reserver_name: input.reserverName,
        phone_number: phoneNumber,
        password_hash: passwordHash,
        total_amount: totalAmount,
      })
      .select("id, reserver_name, phone_number, password_hash, total_amount, created_at")
      .maybeSingle();

  if (reservationInsertError) {
    return failure(
      500,
      reservationErrorCodes.creationFailed,
      reservationInsertError.message,
    );
  }

  if (!reservationInsertData) {
    return failure(500, reservationErrorCodes.creationFailed, "예약 생성 결과를 가져오지 못했습니다.");
  }

  const seatRecords = seatIds.map((seatId) => ({
    reservation_id: reservationId,
    seat_id: seatId,
  }));

  const { error: seatInsertError } = await supabase
    .from("reservation_seats")
    .insert(seatRecords);

  if (seatInsertError) {
    if (seatInsertError.code === "23505") {
      return failure(409, reservationErrorCodes.seatConflict, "다른 사용자가 이미 예약한 좌석이 포함되어 있습니다.");
    }

    return failure(500, reservationErrorCodes.creationFailed, seatInsertError.message);
  }

  const { holdTokens } = holdValidationResult.data;

  await supabase
    .from("seat_holds")
    .delete()
    .in("hold_token", holdTokens);

  const summary = buildReservationSummary(
    reservationInsertData as ReservationRow,
    concertResult.data,
    seats,
  );

  const parsedResponse = CreateReservationResponseSchema.safeParse(summary);

  if (!parsedResponse.success) {
    return failure(500, reservationErrorCodes.creationFailed, "예약 응답 생성에 실패했습니다.");
  }

  return success(parsedResponse.data, 201);
};

const fetchReservationRow = async (
  supabase: SupabaseClient,
  reservationId: string,
): Promise<HandlerResult<ReservationRow, string>> => {
  const { data, error } = await supabase
    .from("reservations")
    .select("id, reserver_name, phone_number, password_hash, total_amount, created_at")
    .eq("id", reservationId)
    .maybeSingle();

  if (error) {
    return failure(500, reservationErrorCodes.summaryFailed, error.message);
  }

  if (!data) {
    return failure(404, reservationErrorCodes.summaryFailed, "예약을 찾을 수 없습니다.");
  }

  return success<ReservationRow>(data as ReservationRow);
};

const fetchReservationSeats = async (
  supabase: SupabaseClient,
  reservationId: string,
): Promise<HandlerResult<SeatWithGradeRow[], string>> => {
  const { data, error } = await supabase
    .from("reservation_seats")
    .select(
      "seat_id, seats!inner(id, concert_id, grade_id, zone, row_label, seat_number, seat_grades(id, grade_code, price_krw))",
    )
    .eq("reservation_id", reservationId);

  if (error) {
    return failure(500, reservationErrorCodes.summaryFailed, error.message);
  }

  const seats = (data ?? [])
    .map((row) => {
      const rawSeat = Array.isArray(row.seats) ? row.seats[0] : row.seats;

      if (!rawSeat) {
        return null;
      }

      return toSeatWithGrade(rawSeat as RawSeatWithGrade);
    })
    .filter((seat): seat is SeatWithGradeRow => seat !== null);

  return success<SeatWithGradeRow[]>(seats);
};

export const getReservationSummary = async (
  supabase: SupabaseClient,
  reservationIdRaw: unknown,
): Promise<HandlerResult<ReservationSummary, string>> => {
  const parsedId = ReservationIdSchema.safeParse(reservationIdRaw);

  if (!parsedId.success) {
    return failure(
      400,
      reservationErrorCodes.invalidPayload,
      "예약 식별자가 올바르지 않습니다.",
      parsedId.error.format(),
    );
  }

  const reservationId = parsedId.data;

  const reservationResult = await fetchReservationRow(supabase, reservationId);

  if (!reservationResult.ok) {
    return propagateError(reservationResult);
  }

  const seatResult = await fetchReservationSeats(supabase, reservationId);

  if (!seatResult.ok) {
    return propagateError(seatResult);
  }

  const seats = seatResult.data;

  if (seats.length === 0) {
    return failure(404, reservationErrorCodes.summaryFailed, "좌석 정보를 찾을 수 없습니다.");
  }

  const concertId = seats[0]?.concert_id;

  if (!concertId) {
    return failure(500, reservationErrorCodes.summaryFailed, "콘서트 정보를 확인할 수 없습니다.");
  }

  const concertResult = await fetchConcert(supabase, concertId);

  if (!concertResult.ok) {
    return propagateError(concertResult);
  }

  const summary = buildReservationSummary(
    reservationResult.data,
    concertResult.data,
    seats,
  );

  const parsedSummary = CreateReservationResponseSchema.safeParse(summary);

  if (!parsedSummary.success) {
    return failure(500, reservationErrorCodes.summaryFailed, "예약 요약 응답 변환 실패.");
  }

  return success(parsedSummary.data);
};

const fetchReservationsByPhone = async (
  supabase: SupabaseClient,
  phoneNumber: string,
): Promise<HandlerResult<ReservationRow[], string>> => {
  const { data, error } = await supabase
    .from("reservations")
    .select("id, reserver_name, phone_number, password_hash, total_amount, created_at")
    .eq("phone_number", phoneNumber);

  if (error) {
    return failure(500, reservationErrorCodes.lookupFailed, error.message);
  }

  const rows = (data ?? []) as ReservationRow[];
  return success<ReservationRow[]>(rows);
};

const fetchSeatsForReservations = async (
  supabase: SupabaseClient,
  reservationIds: string[],
): Promise<HandlerResult<ReservationSeatJoinRow[], string>> => {
  const { data, error } = await supabase
    .from("reservation_seats")
    .select(
      "reservation_id, seats!inner(id, concert_id, grade_id, zone, row_label, seat_number, seat_grades(id, grade_code, price_krw))",
    )
    .in("reservation_id", reservationIds);

  if (error) {
    return failure(500, reservationErrorCodes.lookupFailed, error.message);
  }

  const rows: ReservationSeatJoinRow[] = (data ?? [])
    .map((row) => {
      const rawSeat = Array.isArray(row.seats) ? row.seats[0] : row.seats;

      if (!rawSeat) {
        return null;
      }

      return {
        reservation_id: row.reservation_id,
        seats: toSeatWithGrade(rawSeat as RawSeatWithGrade),
      } satisfies ReservationSeatJoinRow;
    })
    .filter(
      (row): row is ReservationSeatJoinRow => row !== null,
    );

  return success<ReservationSeatJoinRow[]>(rows);
};

export const lookupReservations = async (
  supabase: SupabaseClient,
  payload: unknown,
): Promise<HandlerResult<ReservationLookupResponse, string>> => {
  const parsed = ReservationLookupInputSchema.safeParse(payload);

  if (!parsed.success) {
    return failure(
      400,
      reservationErrorCodes.invalidPayload,
      "예약 조회 요청이 유효하지 않습니다.",
      parsed.error.format(),
    );
  }

  const input = parsed.data;
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);

  const reservationsResult = await fetchReservationsByPhone(supabase, phoneNumber);

  if (!reservationsResult.ok) {
    return propagateError(reservationsResult);
  }

  const reservations = reservationsResult.data.filter((reservation) =>
    verifyPassword(input.password, reservation.password_hash),
  );

  if (reservations.length === 0) {
    return failure(404, reservationErrorCodes.authenticationFailed, "일치하는 예약이 없습니다.");
  }

  const reservationIds = reservations.map((reservation) => reservation.id);

  const seatsResult = await fetchSeatsForReservations(supabase, reservationIds);

  if (!seatsResult.ok) {
    return propagateError(seatsResult);
  }

  const seatsByReservation = new Map<string, SeatWithGradeRow[]>();

  seatsResult.data.forEach((row) => {
    const seat = row.seats;
    const current = seatsByReservation.get(row.reservation_id) ?? [];
    current.push(seat);
    seatsByReservation.set(row.reservation_id, current);
  });

  const concertIds = Array.from(seatsByReservation.values())
    .flat()
    .map((seat) => seat.concert_id);

  const uniqueConcertIds = Array.from(new Set(concertIds));

  const { data: concertRows, error: concertError } = await supabase
    .from("concerts")
    .select("id, title, event_at, venue")
    .in("id", uniqueConcertIds);

  if (concertError) {
    return failure(500, reservationErrorCodes.lookupFailed, concertError.message);
  }

  const concertById = new Map((concertRows ?? []).map((row) => [row.id, row as ConcertRow]));

  const summaries = reservations
    .map((reservation) => {
      const seats = seatsByReservation.get(reservation.id) ?? [];
      const concert = seats.length > 0 ? concertById.get(seats[0]?.concert_id ?? "") : null;

      if (!concert) {
        return null;
      }

      return buildReservationSummary(reservation, concert, seats);
    })
    .filter((summary): summary is ReservationSummary => summary !== null)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  const parsedResponse = ReservationLookupResponseSchema.safeParse({
    reservations: summaries,
  });

  if (!parsedResponse.success) {
    return failure(500, reservationErrorCodes.lookupFailed, "예약 조회 응답 생성 실패.");
  }

  return success(parsedResponse.data);
};
