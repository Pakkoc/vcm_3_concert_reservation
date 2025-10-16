import { z } from "zod";

export const SeatIdSchema = z.string().uuid();

export const CreateHoldInputSchema = z.object({
  seatId: SeatIdSchema,
  sessionHint: z.string().optional(),
  ttlSeconds: z.number().int().positive().optional(),
});

export const CreateHoldResponseSchema = z.object({
  holdToken: z.string().uuid(),
  expiresAt: z.string(),
});

export type CreateHoldInput = z.infer<typeof CreateHoldInputSchema>;
export type CreateHoldResponse = z.infer<typeof CreateHoldResponseSchema>;

export const ReleaseHoldParamsSchema = z.object({
  holdToken: z.string().uuid(),
});

export const VerifyHoldInputSchema = z.object({
  seatIds: z.array(SeatIdSchema).min(1),
});

export const HoldConflictSchema = z.object({
  seatId: SeatIdSchema,
  status: z.enum(["reserved", "held"] as const),
});

export const VerifyHoldResponseSchema = z.object({
  conflicts: z.array(HoldConflictSchema),
});

export type VerifyHoldInput = z.infer<typeof VerifyHoldInputSchema>;
export type VerifyHoldResponse = z.infer<typeof VerifyHoldResponseSchema>;
