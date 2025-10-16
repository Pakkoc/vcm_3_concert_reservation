export const reservationErrorCodes = {
  invalidPayload: "RESERVATION_INVALID_PAYLOAD",
  concertNotFound: "RESERVATION_CONCERT_NOT_FOUND",
  seatNotFound: "RESERVATION_SEAT_NOT_FOUND",
  seatConflict: "RESERVATION_SEAT_CONFLICT",
  holdMissing: "RESERVATION_HOLD_MISSING",
  holdExpired: "RESERVATION_HOLD_EXPIRED",
  holdMismatch: "RESERVATION_HOLD_MISMATCH",
  creationFailed: "RESERVATION_CREATION_FAILED",
  summaryFailed: "RESERVATION_SUMMARY_FAILED",
  lookupFailed: "RESERVATION_LOOKUP_FAILED",
  authenticationFailed: "RESERVATION_AUTH_FAILED",
} as const;

export type ReservationErrorCode =
  (typeof reservationErrorCodes)[keyof typeof reservationErrorCodes];
