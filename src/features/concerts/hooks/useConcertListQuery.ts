"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ConcertListQuerySchema,
  ConcertListResponseSchema,
  type ConcertListQueryInput,
} from "@/features/concerts/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const fetchConcertList = async (variables: ConcertListQueryInput) => {
  try {
    const { data } = await apiClient.get("/api/concerts", {
      params: variables,
    });

    return ConcertListResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "콘서트 목록을 불러오는 중 오류가 발생했습니다.",
    );
    throw new Error(message);
  }
};

export const useConcertListQuery = (
  params: Partial<ConcertListQueryInput> = {},
) => {
  const parsedParams = ConcertListQuerySchema.parse(params);

  return useQuery({
    queryKey: ["concerts", parsedParams],
    queryFn: () => fetchConcertList(parsedParams),
    staleTime: 60 * 1000,
  });
};
