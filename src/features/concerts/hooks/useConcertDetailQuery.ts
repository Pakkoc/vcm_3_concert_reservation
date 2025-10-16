"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ConcertDetailSchema,
  type ConcertDetail,
} from "@/features/concerts/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const fetchConcertDetail = async (concertId: string) => {
  try {
    const { data } = await apiClient.get(`/api/concerts/${concertId}`);
    return ConcertDetailSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "콘서트 상세 정보를 불러오지 못했습니다.",
    );
    throw new Error(message);
  }
};

export const useConcertDetailQuery = (concertId: string) => {
  return useQuery<ConcertDetail, Error>({
    queryKey: ["concertDetail", concertId],
    queryFn: () => fetchConcertDetail(concertId),
    staleTime: 30 * 1000,
    enabled: Boolean(concertId),
  });
};
