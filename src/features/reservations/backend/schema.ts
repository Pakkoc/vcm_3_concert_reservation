import { z } from "zod";

export const ReservationIdSchema = z.string().uuid();
export const SeatIdSchema = z.string().uuid();

export const ReservationSeatSelectionSchema = z.object({
  seatId: SeatIdSchema,
  holdToken: z.string().uuid(),
});

export const CreateReservationInputSchema = z.object({
  concertId: z.string().uuid(),
  reserverName: z.string().min(2).max(50),
  phoneNumber: z.string().regex(/^\d{10,11}$/),
  password: z.string().regex(/^\d{4}$/),
  selections: z.array(ReservationSeatSelectionSchema).min(1).max(4),
});

export const ReservationSeatSchema = z.object({
  seatId: SeatIdSchema,
  zone: z.string().min(1),
  rowLabel: z.string().min(1),
  seatNumber: z.number().int().positive(),
  gradeId: z.string().uuid(),
  gradeCode: z.string(),
  price: z.number().int().nonnegative(),
});

export const ReservationSummarySchema = z.object({
  reservationId: ReservationIdSchema,
  concertId: z.string().uuid(),
  concertTitle: z.string(),
  eventAt: z.string(),
  venue: z.string(),
  reserverName: z.string(),
  maskedPhone: z.string(),
  seats: z.array(ReservationSeatSchema),
  totalAmount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const CreateReservationResponseSchema = ReservationSummarySchema;

export const ReservationLookupInputSchema = z.object({
  phoneNumber: z.string().regex(/^\d{10,11}$/),
  password: z.string().regex(/^\d{4}$/),
});

export const ReservationLookupResponseSchema = z.object({
  reservations: z.array(ReservationSummarySchema),
});

export type CreateReservationInput = z.infer<typeof CreateReservationInputSchema>;
export type ReservationSeatSelection = z.infer<typeof ReservationSeatSelectionSchema>;
export type ReservationSummary = z.infer<typeof ReservationSummarySchema>;
export type CreateReservationResponse = z.infer<
  typeof CreateReservationResponseSchema
>;
export type ReservationLookupInput = z.infer<typeof ReservationLookupInputSchema>;
export type ReservationLookupResponse = z.infer<
  typeof ReservationLookupResponseSchema
>;
