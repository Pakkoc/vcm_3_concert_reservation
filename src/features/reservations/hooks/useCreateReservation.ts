"use client";

import { useMutation } from "@tanstack/react-query";
import {
  CreateReservationInputSchema,
  CreateReservationResponseSchema,
  type CreateReservationInput,
  type CreateReservationResponse,
} from "@/features/reservations/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const createReservationRequest = async (payload: CreateReservationInput) => {
  const parsed = CreateReservationInputSchema.parse(payload);

  try {
    const { data } = await apiClient.post("/api/reservations", parsed);
    return CreateReservationResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "예약을 완료하는 중 문제가 발생했습니다.",
    );
    throw new Error(message);
  }
};

export const useCreateReservation = () => {
  return useMutation<CreateReservationResponse, Error, CreateReservationInput>({
    mutationFn: createReservationRequest,
  });
};
