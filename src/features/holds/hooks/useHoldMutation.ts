"use client";

import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  CreateHoldInputSchema,
  CreateHoldResponseSchema,
  VerifyHoldInputSchema,
  VerifyHoldResponseSchema,
} from "@/features/holds/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";

const ReleaseHoldResponseSchema = z.object({
  released: z.boolean(),
});

const createHoldRequest = async (
  payload: z.infer<typeof CreateHoldInputSchema>,
) => {
  try {
    const { data } = await apiClient.post("/api/holds", payload);
    return CreateHoldResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "좌석을 선택하는 중 문제가 발생했습니다.",
    );
    throw new Error(message);
  }
};

const releaseHoldRequest = async (holdToken: string) => {
  try {
    const { data } = await apiClient.delete(`/api/holds/${holdToken}`);
    return ReleaseHoldResponseSchema.parse(data).released;
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "좌석 선택을 취소하는 중 문제가 발생했습니다.",
    );
    throw new Error(message);
  }
};

const verifyHoldRequest = async (seatIds: string[]) => {
  try {
    const payload = VerifyHoldInputSchema.parse({ seatIds });
    const { data } = await apiClient.post("/api/holds/verify", payload);
    return VerifyHoldResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "좌석 상태를 확인하는 중 문제가 발생했습니다.",
    );
    throw new Error(message);
  }
};

export const useHoldMutation = () => {
  const createMutation = useMutation({
    mutationFn: createHoldRequest,
  });

  const releaseMutation = useMutation({
    mutationFn: releaseHoldRequest,
  });

  const verifyMutation = useMutation({
    mutationFn: verifyHoldRequest,
  });

  return {
    createHold: createMutation.mutateAsync,
    releaseHold: releaseMutation.mutateAsync,
    verifyHold: verifyMutation.mutateAsync,
    createStatus: createMutation.status,
    releaseStatus: releaseMutation.status,
    verifyStatus: verifyMutation.status,
  };
};
