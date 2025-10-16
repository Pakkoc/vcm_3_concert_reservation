"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ReservationLookupInputSchema,
  ReservationLookupResponseSchema,
  type ReservationLookupInput,
  type ReservationLookupResponse,
} from "@/features/reservations/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const lookupReservationsRequest = async (
  input: ReservationLookupInput,
) => {
  const payload = ReservationLookupInputSchema.parse(input);

  try {
    const { data } = await apiClient.post("/api/reservations/lookup", payload);
    return ReservationLookupResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "예약을 조회하는 중 문제가 발생했습니다.",
    );
    throw new Error(message);
  }
};

export const useReservationLookup = () => {
  return useMutation<
    ReservationLookupResponse,
    Error,
    ReservationLookupInput
  >({
    mutationFn: lookupReservationsRequest,
  });
};
