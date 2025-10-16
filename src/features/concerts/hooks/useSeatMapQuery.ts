"use client";

import { useQuery } from "@tanstack/react-query";
import {
  SeatMapResponseSchema,
  type SeatMapResponse,
} from "@/features/concerts/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const fetchSeatMap = async (concertId: string) => {
  try {
    const { data } = await apiClient.get(
      `/api/concerts/${concertId}/seats/map`,
    );
    return SeatMapResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "좌석 정보를 불러오는 중 문제가 발생했습니다.",
    );
    throw new Error(message);
  }
};

export const useSeatMapQuery = (concertId: string) => {
  return useQuery<SeatMapResponse, Error>({
    queryKey: ["seatMap", concertId],
    queryFn: () => fetchSeatMap(concertId),
    enabled: Boolean(concertId),
    refetchInterval: 15 * 1000,
  });
};
