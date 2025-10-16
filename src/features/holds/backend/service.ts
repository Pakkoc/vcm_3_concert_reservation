import type { SupabaseClient } from "@supabase/supabase-js";
import { addSeconds, isAfter } from "date-fns";
import { randomUUID } from "crypto";
import {
  failure,
  success,
  type ErrorResult,
  type HandlerResult,
} from "@/backend/http/response";
import {
  CreateHoldInputSchema,
  CreateHoldResponseSchema,
  ReleaseHoldParamsSchema,
  VerifyHoldInputSchema,
  VerifyHoldResponseSchema,
  type CreateHoldResponse,
  type VerifyHoldResponse,
} from "./schema";
import { holdErrorCodes } from "./error";
import { DEFAULT_HOLD_TTL_SECONDS } from "@/features/holds/constants";

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

const ensureSeatExists = async (
  supabase: SupabaseClient,
  seatId: string,
): Promise<HandlerResult<{ id: string }, string>> => {
  const { data, error } = await supabase
    .from("seats")
    .select("id")
    .eq("id", seatId)
    .maybeSingle();

  if (error) {
    return failure(500, holdErrorCodes.creationFailed, error.message);
  }

  if (!data) {
    return failure(404, holdErrorCodes.seatNotFound, "좌석을 찾을 수 없습니다.");
  }

  return success<{ id: string }>(data as { id: string });
};

const ensureSeatNotReserved = async (
  supabase: SupabaseClient,
  seatId: string,
): Promise<HandlerResult<null, string>> => {
  const { data, error } = await supabase
    .from("reservation_seats")
    .select("seat_id")
    .eq("seat_id", seatId)
    .maybeSingle();

  if (error) {
    return failure(500, holdErrorCodes.creationFailed, error.message);
  }

  if (data) {
    return failure(409, holdErrorCodes.seatAlreadyReserved, "이미 예약된 좌석입니다.");
  }

  return success<null>(null);
};

export const createSeatHold = async (
  supabase: SupabaseClient,
  payload: unknown,
): Promise<HandlerResult<CreateHoldResponse, string>> => {
  const parsed = CreateHoldInputSchema.safeParse(payload);

  if (!parsed.success) {
    return failure(
      400,
      holdErrorCodes.invalidPayload,
      "좌석 홀드 요청 형식이 올바르지 않습니다.",
      parsed.error.format(),
    );
  }

  const { seatId, sessionHint, ttlSeconds } = parsed.data;

  const seatExistsResult = await ensureSeatExists(supabase, seatId);

  if (!seatExistsResult.ok) {
    return propagateError(seatExistsResult);
  }

  const seatReservationResult = await ensureSeatNotReserved(supabase, seatId);

  if (!seatReservationResult.ok) {
    return propagateError(seatReservationResult);
  }

  const { data: existingHold, error: holdFetchError } = await supabase
    .from("seat_holds")
    .select("id, hold_token, session_hint, expires_at")
    .eq("seat_id", seatId)
    .maybeSingle();

  if (holdFetchError) {
    return failure(500, holdErrorCodes.creationFailed, holdFetchError.message);
  }

  const ttl = ttlSeconds ?? DEFAULT_HOLD_TTL_SECONDS;
  const now = new Date();
  const nextExpiry = addSeconds(now, ttl).toISOString();

  if (existingHold) {
    const expiry = new Date(existingHold.expires_at);

    if (isAfter(expiry, now)) {
      if (sessionHint && existingHold.session_hint === sessionHint) {
        const { error: updateError } = await supabase
          .from("seat_holds")
          .update({
            expires_at: nextExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingHold.id);

        if (updateError) {
          return failure(500, holdErrorCodes.creationFailed, updateError.message);
        }

        const parsedResponse = CreateHoldResponseSchema.safeParse({
          holdToken: existingHold.hold_token,
          expiresAt: nextExpiry,
        });

        if (!parsedResponse.success) {
          return failure(
            500,
            holdErrorCodes.creationFailed,
            "홀드 응답 변환에 실패했습니다.",
          );
        }

        return success(parsedResponse.data, 201);
      }

      return failure(409, holdErrorCodes.seatAlreadyHeld, "이미 홀드된 좌석입니다.");
    }

    await supabase.from("seat_holds").delete().eq("id", existingHold.id);
  }

  const holdId = randomUUID();
  const holdToken = randomUUID();

  const { error: insertError } = await supabase.from("seat_holds").insert({
    id: holdId,
    seat_id: seatId,
    hold_token: holdToken,
    session_hint: sessionHint ?? null,
    expires_at: nextExpiry,
  });

  if (insertError) {
    return failure(500, holdErrorCodes.creationFailed, insertError.message);
  }

  const parsedResponse = CreateHoldResponseSchema.safeParse({
    holdToken,
    expiresAt: nextExpiry,
  });

  if (!parsedResponse.success) {
    return failure(500, holdErrorCodes.creationFailed, "홀드 응답 변환에 실패했습니다.");
  }

  return success(parsedResponse.data, 201);
};

export const releaseSeatHold = async (
  supabase: SupabaseClient,
  params: unknown,
) => {
  const parsed = ReleaseHoldParamsSchema.safeParse(params);

  if (!parsed.success) {
    return failure(
      400,
      holdErrorCodes.invalidPayload,
      "홀드 해제 파라미터가 올바르지 않습니다.",
      parsed.error.format(),
    );
  }

  const { holdToken } = parsed.data;

  const { data, error } = await supabase
    .from("seat_holds")
    .delete()
    .eq("hold_token", holdToken)
    .select("id")
    .maybeSingle();

  if (error) {
    return failure(500, holdErrorCodes.releaseFailed, error.message);
  }

  if (!data) {
    return failure(404, holdErrorCodes.releaseFailed, "해당 홀드를 찾을 수 없습니다.");
  }

  return success({ released: true } as const);
};

export const verifySeatAvailability = async (
  supabase: SupabaseClient,
  payload: unknown,
): Promise<HandlerResult<VerifyHoldResponse, string>> => {
  const parsed = VerifyHoldInputSchema.safeParse(payload);

  if (!parsed.success) {
    return failure(
      400,
      holdErrorCodes.invalidPayload,
      "좌석 검증 요청 형식이 올바르지 않습니다.",
      parsed.error.format(),
    );
  }

  const { seatIds } = parsed.data;

  const now = new Date();

  const { data: reservedSeats, error: reservedError } = await supabase
    .from("reservation_seats")
    .select("seat_id")
    .in("seat_id", seatIds);

  if (reservedError) {
    return failure(500, holdErrorCodes.verificationFailed, reservedError.message);
  }

  const { data: holdRows, error: holdError } = await supabase
    .from("seat_holds")
    .select("seat_id, expires_at")
    .in("seat_id", seatIds);

  if (holdError) {
    return failure(500, holdErrorCodes.verificationFailed, holdError.message);
  }

  const reservedSet = new Set((reservedSeats ?? []).map((row) => row.seat_id));
  const heldSet = new Set(
    (holdRows ?? [])
      .filter((row) => isAfter(new Date(row.expires_at), now))
      .map((row) => row.seat_id),
  );

  const conflicts = seatIds.reduce((acc, seatId) => {
    if (reservedSet.has(seatId)) {
      acc.push({ seatId, status: "reserved" as const });
      return acc;
    }

    if (heldSet.has(seatId)) {
      acc.push({ seatId, status: "held" as const });
    }

    return acc;
  }, [] as VerifyHoldResponse["conflicts"]);

  const parsedResponse = VerifyHoldResponseSchema.safeParse({ conflicts });

  if (!parsedResponse.success) {
    return failure(500, holdErrorCodes.verificationFailed, "좌석 검증 응답 변환에 실패했습니다.");
  }

  return success(parsedResponse.data);
};
