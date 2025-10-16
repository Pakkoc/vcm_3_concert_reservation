import { z } from "zod";

export const ConcertIdSchema = z.string().uuid();

export const ConcertListQuerySchema = z.object({
  sortBy: z
    .enum(["eventAt", "title", "venue"] as const)
    .default("eventAt"),
  sortOrder: z.enum(["asc", "desc"] as const).default("asc"),
});

export type ConcertListQueryInput = z.infer<typeof ConcertListQuerySchema>;

export const ConcertSummarySchema = z.object({
  id: ConcertIdSchema,
  title: z.string(),
  eventAt: z.string(),
  venue: z.string(),
  appliedCount: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
});

export const ConcertListResponseSchema = z.object({
  concerts: z.array(ConcertSummarySchema),
});

export type ConcertSummary = z.infer<typeof ConcertSummarySchema>;
export type ConcertListResponse = z.infer<typeof ConcertListResponseSchema>;

export const SeatGradeSummarySchema = z.object({
  gradeId: z.string().uuid(),
  gradeCode: z.string(),
  gradeName: z.string(),
  price: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  held: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
});

export type SeatGradeSummary = z.infer<typeof SeatGradeSummarySchema>;

export const ConcertDetailSchema = z.object({
  id: ConcertIdSchema,
  title: z.string(),
  description: z.string().optional().default(""),
  eventAt: z.string(),
  venue: z.string(),
  capacity: z.number().int().nonnegative(),
  appliedCount: z.number().int().nonnegative(),
  grades: z.array(SeatGradeSummarySchema),
});

export type ConcertDetail = z.infer<typeof ConcertDetailSchema>;

export const SeatStatusSchema = z.enum(["available", "held", "reserved"]);

export const SeatMapCellSchema = z.object({
  seatId: z.string().uuid(),
  gradeId: z.string().uuid(),
  gradeCode: z.string(),
  zone: z.string().min(1),
  rowLabel: z.string().min(1),
  seatNumber: z.number().int().positive(),
  status: SeatStatusSchema,
});

export const SeatMapResponseSchema = z.object({
  concertId: ConcertIdSchema,
  seats: z.array(SeatMapCellSchema),
});

export type SeatMapCell = z.infer<typeof SeatMapCellSchema>;
export type SeatMapResponse = z.infer<typeof SeatMapResponseSchema>;
