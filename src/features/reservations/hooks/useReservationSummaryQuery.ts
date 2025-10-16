"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CreateReservationResponseSchema,
  type ReservationSummary,
} from "@/features/reservations/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const fetchReservationSummary = async (reservationId: string) => {
  try {
    const { data } = await apiClient.get(
      `/api/reservations/${reservationId}`,
    );
    return CreateReservationResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "예약 정보를 불러오지 못했습니다.",
    );
    throw new Error(message);
  }
};

export const useReservationSummaryQuery = (reservationId: string) => {
  return useQuery<ReservationSummary, Error>({
    queryKey: ["reservationSummary", reservationId],
    queryFn: () => fetchReservationSummary(reservationId),
    enabled: Boolean(reservationId),
  });
};
